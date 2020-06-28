/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import { DEFAULT_INDEX_KEY } from '../../../../../common/constants';
import { ExceptionListItem } from './exception_item';
import { useFetchIndexPatterns } from '../../../../alerts/containers/detection_engine/rules/fetch_index_patterns';
import { useUiSetting$ } from '../../../lib/kibana';
import { ExceptionListItemSchema } from '../../../../../public/lists_plugin_deps';
import { AndOrBadge } from '../../and_or_badge';

export const MyOrWrapper = styled(EuiFlexItem)`
  margin: 8px 0 8px 54px;
`;

interface ExceptionBuilderProps {
  exceptionListItems: ExceptionListItemSchema[];
}

export const ExceptionBuilder = ({ exceptionListItems }: ExceptionBuilderProps) => {
  const [andLogicIncluded, setAndLogicIncluded] = useState<boolean>(false);
  const [exceptions, setExceptions] = useState<ExceptionListItemSchema[]>([]);
  const [indicesConfig] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const [{ browserFields, isLoading: indexPatternLoading, indexPatterns }] = useFetchIndexPatterns(
    indicesConfig ?? []
  );

  const handleExceptionItemChange = (item: ExceptionListItemSchema, index: number) => {
    console.log(JSON.stringify(item));

    const updatedExceptions = [
      ...exceptions.slice(0, index),
      {
        ...item,
      },
      ...exceptions.slice(index + 1),
    ];

    setExceptions(updatedExceptions);
  };

  useEffect(() => {
    setExceptions(exceptionListItems);
    setAndLogicIncluded(exceptionListItems.length > 1);
  }, [exceptionListItems]);

  return (
    <EuiFlexGroup gutterSize="none" direction="column">
      {exceptions.map((exceptionListItem, index) => (
        <EuiFlexItem grow={1} key={`${exceptionListItem.id}`}>
          <EuiFlexGroup gutterSize="none" direction="column">
            {index !== 0 &&
              (andLogicIncluded ? (
                <MyOrWrapper grow={false}>
                  <AndOrBadge type="or" />
                </MyOrWrapper>
              ) : (
                <EuiFlexItem grow={false}>
                  <AndOrBadge type="or" />
                </EuiFlexItem>
              ))}
            <EuiFlexItem grow={false}>
              <ExceptionListItem
                exceptionItem={exceptionListItem}
                exceptionItemIndex={index}
                indexPattern={indexPatterns}
                browserFields={browserFields}
                isLoading={indexPatternLoading}
                onExceptionItemChange={handleExceptionItemChange}
                onDeleteEntry={() => {}}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

ExceptionBuilder.displayName = 'ExceptionBuilder';
