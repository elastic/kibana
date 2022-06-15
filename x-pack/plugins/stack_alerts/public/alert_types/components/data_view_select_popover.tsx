/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiExpression,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { DataViewsList } from '@kbn/unified-search-plugin/public';
import { DataViewListItem } from '@kbn/data-views-plugin/public';
import { useTriggersAndActionsUiDeps } from '../es_query/util';

interface DataViewSelectPopoverProps {
  onSelectDataView: (newDataViewId: string) => void;
  initialDataViewTitle: string;
  initialDataViewId?: string;
}

export const DataViewSelectPopover: React.FunctionComponent<DataViewSelectPopoverProps> = ({
  onSelectDataView,
  initialDataViewTitle,
  initialDataViewId,
}) => {
  const { data } = useTriggersAndActionsUiDeps();
  const [dataViewItems, setDataViewsItems] = useState<DataViewListItem[]>();
  const [dataViewPopoverOpen, setDataViewPopoverOpen] = useState(false);

  const [selectedDataViewId, setSelectedDataViewId] = useState(initialDataViewId);
  const [selectedTitle, setSelectedTitle] = useState<string>(initialDataViewTitle);

  useEffect(() => {
    const initDataViews = async () => {
      const fetchedDataViewItems = await data.dataViews.getIdsWithTitle();
      setDataViewsItems(fetchedDataViewItems);
    };
    initDataViews();
  }, [data.dataViews]);

  const closeDataViewPopover = useCallback(() => setDataViewPopoverOpen(false), []);

  if (!dataViewItems) {
    return null;
  }

  return (
    <EuiPopover
      id="dataViewPopover"
      button={
        <EuiExpression
          display="columns"
          data-test-subj="selectDataViewExpression"
          description={i18n.translate('xpack.stackAlerts.components.ui.alertParams.dataViewLabel', {
            defaultMessage: 'data view',
          })}
          value={selectedTitle}
          isActive={dataViewPopoverOpen}
          onClick={() => {
            setDataViewPopoverOpen(true);
          }}
          isInvalid={!selectedTitle}
        />
      }
      isOpen={dataViewPopoverOpen}
      closePopover={closeDataViewPopover}
      ownFocus
      anchorPosition="downLeft"
      display="block"
    >
      <div style={{ width: '450px' }} data-test-subj="chooseDataViewPopoverContent">
        <EuiPopoverTitle>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem>
              {i18n.translate('xpack.stackAlerts.components.ui.alertParams.dataViewPopoverTitle', {
                defaultMessage: 'Data view',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj="closeDataViewPopover"
                iconType="cross"
                color="danger"
                aria-label={i18n.translate(
                  'xpack.stackAlerts.components.ui.alertParams.closeDataViewPopoverLabel',
                  { defaultMessage: 'Close' }
                )}
                onClick={closeDataViewPopover}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>
        <EuiFormRow id="indexSelectSearchBox" fullWidth>
          <DataViewsList
            dataViewsList={dataViewItems}
            onChangeDataView={(newId) => {
              setSelectedDataViewId(newId);
              const newTitle = dataViewItems?.find(({ id }) => id === newId)?.title;
              if (newTitle) {
                setSelectedTitle(newTitle);
              }

              onSelectDataView(newId);
              closeDataViewPopover();
            }}
            currentDataViewId={selectedDataViewId}
          />
        </EuiFormRow>
      </div>
    </EuiPopover>
  );
};
