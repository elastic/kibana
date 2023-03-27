/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  CriteriaWithPagination,
  EuiBasicTableColumn,
  HorizontalAlignment,
} from '@elastic/eui';

import type { ExceptionListSchema, ListArray } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionListRuleReferencesSchema } from '../../../../../../common/detection_engine/rule_exceptions';
import { getExceptionItemsReferences } from '../../../../../exceptions/api';
import * as i18n from './translations';
import * as commoni18n from '../translations';
import type { RuleReferences } from '../../../logic/use_find_references';
import { LinkListSwitch } from './link_list_switch';
import { getSharedListsTableColumns } from '../utils';

export interface ExceptionsAddToListsComponentProps {
  /**
   * Normally if there's no sharedExceptionLists, this opition is disabled, however,
   * when adding an exception item from the exception lists management page, there is no
   * list or rule to go off of, so user can select to add the exception to any rule or to any
   * shared list.
   */
  showAllSharedLists: boolean;
  /* Shared exception lists to display as options to add item to */
  sharedExceptionLists: ListArray;
  onListSelectionChange: (listsSelectedToAdd: ExceptionListSchema[]) => void;
}

export const useAddToSharedListTable = ({
  showAllSharedLists,
  sharedExceptionLists,
  onListSelectionChange,
}: ExceptionsAddToListsComponentProps) => {
  const [listsToDisplay, setListsToDisplay] = useState<ExceptionListRuleReferencesSchema[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const listsToFetch = useMemo(() => {
    return showAllSharedLists ? [] : sharedExceptionLists;
  }, [showAllSharedLists, sharedExceptionLists]);

  // here we don't have initial selected lists as they component is used only in the Add Exception Flyout
  const [linkedLists, setLinkedLists] = useState<ExceptionListRuleReferencesSchema[]>([]);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    initialPageSize: 5,
    showPerPageOptions: false,
  });

  const [error, setError] = useState<string | undefined>(undefined);

  const getReferences = useCallback(async () => {
    try {
      setIsLoading(true);
      return getExceptionItemsReferences(
        (!listsToFetch.length
          ? [{ namespace_type: 'single' }]
          : listsToFetch) as ExceptionListSchema[]
      );
    } catch (err) {
      setError(i18n.REFERENCES_FETCH_ERROR);
    }
  }, [listsToFetch]);

  const fillListsToDisplay = useCallback(async () => {
    const result = (await getReferences()) as RuleReferences;
    if (!result) {
      return setIsLoading(false);
    }
    const lists: ExceptionListRuleReferencesSchema[] = [];

    for (const value of Object.values(result))
      if (value.type === ExceptionListTypeEnum.DETECTION) lists.push(value);

    setListsToDisplay(lists);
    setIsLoading(false);
  }, [getReferences]);

  useEffect(() => {
    fillListsToDisplay();
  }, [listsToFetch, getReferences, fillListsToDisplay]);

  useEffect(() => {
    onListSelectionChange(
      linkedLists.map(
        ({
          referenced_rules: _,
          namespace_type: namespaceType,
          os_types: osTypes,
          tags,
          ...rest
        }) => ({
          ...rest,
          namespace_type: namespaceType ?? 'single',
          os_types: osTypes ?? [],
          tags: tags ?? [],
        })
      )
    );
  }, [linkedLists, onListSelectionChange]);

  const listTableColumnsWithLinkSwitch: Array<
    EuiBasicTableColumn<ExceptionListRuleReferencesSchema>
  > = useMemo(
    () => [
      {
        field: 'link',
        name: commoni18n.LINK_COLUMN,
        align: 'left' as HorizontalAlignment,
        'data-test-subj': 'ruleActionLinkRuleSwitch',
        render: (_, rule: ExceptionListRuleReferencesSchema) => (
          <LinkListSwitch
            dataTestSubj="addToSharedListSwitch"
            list={rule}
            linkedList={linkedLists}
            onListLinkChange={setLinkedLists}
          />
        ),
      },
      ...getSharedListsTableColumns(),
    ],
    [linkedLists]
  );
  const onTableChange = useCallback(
    ({ page: { index } }: CriteriaWithPagination<never>) =>
      setPagination({ ...pagination, pageIndex: index }),
    [pagination]
  );
  return {
    error,
    isLoading,
    pagination,
    lists: listsToDisplay,
    listTableColumnsWithLinkSwitch,
    addToSelectedListDescription: i18n.ADD_TO_LISTS_DESCRIPTION,
    onTableChange,
  };
};
