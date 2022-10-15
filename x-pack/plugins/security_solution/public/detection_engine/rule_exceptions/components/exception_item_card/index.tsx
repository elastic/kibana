/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps } from '@elastic/eui';
import { EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo, useCallback } from 'react';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { getFormattedComments } from '../../utils/helpers';
import type { ExceptionListItemIdentifiers } from '../../utils/types';
import * as i18n from './translations';
import { ExceptionItemCardHeader } from './header';
import { ExceptionItemCardConditions } from './conditions';
import { ExceptionItemCardMetaInfo } from './meta';
import type { ExceptionListRuleReferencesSchema } from '../../../../../common/detection_engine/rule_exceptions';
import { ExceptionItemCardComments } from './comments';

export interface ExceptionItemProps {
  exceptionItem: ExceptionListItemSchema;
  listType: ExceptionListTypeEnum;
  disableActions: boolean;
  ruleReferences: ExceptionListRuleReferencesSchema | null;
  onDeleteException: (arg: ExceptionListItemIdentifiers) => void;
  onEditException: (item: ExceptionListItemSchema) => void;
  dataTestSubj: string;
}

const ExceptionItemCardComponent = ({
  disableActions,
  exceptionItem,
  listType,
  ruleReferences,
  onDeleteException,
  onEditException,
  dataTestSubj,
}: ExceptionItemProps): JSX.Element => {
  const handleDelete = useCallback((): void => {
    onDeleteException({
      id: exceptionItem.id,
      name: exceptionItem.name,
      namespaceType: exceptionItem.namespace_type,
    });
  }, [onDeleteException, exceptionItem.id, exceptionItem.name, exceptionItem.namespace_type]);

  const handleEdit = useCallback((): void => {
    onEditException(exceptionItem);
  }, [onEditException, exceptionItem]);

  const formattedComments = useMemo((): EuiCommentProps[] => {
    return getFormattedComments(exceptionItem.comments);
  }, [exceptionItem.comments]);

  return (
    <EuiPanel paddingSize="l" data-test-subj={dataTestSubj} hasBorder hasShadow={false}>
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem data-test-subj={`${dataTestSubj}-header`}>
          <ExceptionItemCardHeader
            item={exceptionItem}
            actions={[
              {
                key: 'edit',
                icon: 'controlsHorizontal',
                label:
                  listType === ExceptionListTypeEnum.ENDPOINT
                    ? i18n.ENDPOINT_EXCEPTION_ITEM_EDIT_BUTTON
                    : i18n.EXCEPTION_ITEM_EDIT_BUTTON,
                onClick: handleEdit,
              },
              {
                key: 'delete',
                icon: 'trash',
                label:
                  listType === ExceptionListTypeEnum.ENDPOINT
                    ? i18n.ENDPOINT_EXCEPTION_ITEM_DELETE_BUTTON
                    : i18n.EXCEPTION_ITEM_DELETE_BUTTON,
                onClick: handleDelete,
              },
            ]}
            disableActions={disableActions}
            dataTestSubj="exceptionItemCardHeader"
          />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj={`${dataTestSubj}-meta`}>
          <ExceptionItemCardMetaInfo
            item={exceptionItem}
            references={ruleReferences}
            dataTestSubj="exceptionItemCardMetaInfo"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <ExceptionItemCardConditions
            os={exceptionItem.os_types}
            entries={exceptionItem.entries}
            dataTestSubj="exceptionItemCardConditions"
          />
        </EuiFlexItem>
        {formattedComments.length > 0 && <ExceptionItemCardComments comments={formattedComments} />}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

ExceptionItemCardComponent.displayName = 'ExceptionItemCardComponent';

export const ExceptionItemCard = React.memo(ExceptionItemCardComponent);

ExceptionItemCard.displayName = 'ExceptionItemCard';
