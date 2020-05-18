/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { ExceptionItemComponent } from './exception_item';
import { AndOrExceptionOperator } from './and_or_operator';
import { AndOrBadge } from '../and_or_badge';
import { useFetchIndexPatterns } from '../../../alerts/containers/detection_engine/rules/fetch_index_patterns';
import { useUiSetting$ } from '../../lib/kibana';
import { ExceptionItem, Operator } from './types';
import {
  createExceptionItem,
  getNonDeletedExceptionItems,
  getUpdatedExceptionItems,
} from './helpers';

export const MyExceptionBuilder = styled.div`
  margin: 10px 0;

  .exceptionItemEntryContainer:not(:last-of-type) {
    margin-bottom: 8px;
  }

  .exceptionItemContainer:first-of-type {
    .exceptionItemEntryContainer:first-of-type .exceptionItemEntryDeleteButton {
      margin-top: 18px;
    }

    .exceptionAndBadgeContainer {
      padding-top: 22px;
    }
  }

  .exceptionOrBadge {
    margin: 8px 0;
  }

  .exceptionIndent {
    margin: 8px 0 8px 54px;
  }
`;

interface ExceptionBuilderProps {
  exceptionItems: ExceptionItem[];
  listType: string;
  listId: string;
  dataTestSubj: string;
  idAria: string;
  onChange: (args: ExceptionItem[]) => boolean;
}

export const ExceptionBuilder = ({
  exceptionItems,
  dataTestSubj,
  idAria,
  listType,
  listId,
  onChange,
}: ExceptionBuilderProps) => {
  const [andLogicIncluded, setAndLogicIncluded] = useState<boolean>(false);
  const [exceptionBuilderData, setExceptionBuilderData] = useState<ExceptionItem[]>(exceptionItems);
  const [indicesConfig] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const [{ browserFields, isLoading: indexPatternLoading }] = useFetchIndexPatterns(
    indicesConfig ?? []
  );

  const onExceptionItemChange = useCallback(
    (updatedException: ExceptionItem, index: number): void => {
      const updatedExceptions = getUpdatedExceptionItems({
        updatedException,
        exceptions: exceptionBuilderData,
        index,
      });

      setExceptionBuilderData([...updatedExceptions]);
      onChange([...updatedExceptions]);
    },
    [exceptionBuilderData]
  );

  const addExceptionItemEntry = useCallback((): void => {
    const updatedException = {
      ...exceptionBuilderData[exceptionBuilderData.length - 1],
      entries: [
        ...exceptionBuilderData[exceptionBuilderData.length - 1].entries,
        {
          field: '',
          operator: Operator.INCLUSION,
          match: '',
        },
      ],
    };

    const updatedExceptions = [
      ...exceptionBuilderData.slice(0, exceptionBuilderData.length - 1),
      {
        ...updatedException,
      },
    ];

    if (updatedException.entries.length > 1) {
      setAndLogicIncluded(true);
    }

    setExceptionBuilderData([...updatedExceptions]);
    onChange([...updatedExceptions]);
  }, [exceptionBuilderData]);

  const addExceptionItem = useCallback((): void => {
    const newException = createExceptionItem({ listType, listId });
    setExceptionBuilderData([...exceptionBuilderData, newException]);
    onChange([...exceptionBuilderData, newException]);
  }, [exceptionBuilderData]);

  const onAddExceptionClicked = useCallback(() => {
    const items = getNonDeletedExceptionItems(exceptionBuilderData);

    if (items.length === 1) {
      addExceptionItemEntry();
    } else {
      addExceptionItem();
    }
  }, [exceptionBuilderData]);

  const onDeleteEntry = useCallback(
    (updatedException: ExceptionItem, index: number): void => {
      const updatedExceptions = getUpdatedExceptionItems({
        updatedException,
        exceptions: exceptionBuilderData,
        index,
      });

      const multiEntryExceptionItems = getNonDeletedExceptionItems(updatedExceptions).filter(
        t => t.entries.length > 1
      );

      setAndLogicIncluded(multiEntryExceptionItems.length > 0);
      setExceptionBuilderData([...updatedExceptions]);
      onChange([...updatedExceptions]);
    },
    [exceptionBuilderData]
  );

  const exceptions = getNonDeletedExceptionItems(exceptionBuilderData);

  return (
    <MyExceptionBuilder>
      <EuiFlexGroup gutterSize="none" direction="column">
        {exceptions.map((exceptionItem, index) => (
          <EuiFlexItem
            grow={1}
            key={`${exceptionItem.item_id}`}
            className="exceptionItemContainer"
            data-test-subj={dataTestSubj}
          >
            <EuiFlexGroup
              gutterSize="none"
              direction="column"
              data-test-subj={`exceptionItemFlexGroup-${dataTestSubj}-`}
            >
              {index !== 0 && (
                <EuiFlexItem
                  grow={false}
                  className={andLogicIncluded ? 'exceptionIndent' : 'exceptionOrBadge'}
                >
                  <AndOrBadge type="or" />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false} data-test-subj={`exceptionItemWrapper-${dataTestSubj}`}>
                <ExceptionItemComponent
                  listType={listType}
                  exceptionItemIndex={index}
                  exceptionItem={exceptionItem}
                  onChange={onExceptionItemChange}
                  browserFields={browserFields}
                  setAndLogicIncluded={setAndLogicIncluded}
                  isAndLogicIncluded={andLogicIncluded}
                  indexPatternLoading={indexPatternLoading}
                  onDelete={onDeleteEntry}
                  idAria={idAria}
                  data-test-subj={`exceptionItemContent-${dataTestSubj}`}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}

        <EuiFlexItem data-test-subj={`andOrOperatorButtons-${dataTestSubj}`}>
          <AndOrExceptionOperator
            displayInitButton={
              exceptions.length === 0 ||
              (exceptions.length === 1 && exceptions[0].entries.length === 0)
            }
            indent={andLogicIncluded}
            onOrClicked={addExceptionItem}
            onAndClicked={addExceptionItemEntry}
            onAddExceptionClicked={onAddExceptionClicked}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </MyExceptionBuilder>
  );
};

ExceptionBuilder.displayName = 'ExceptionBuilder';
