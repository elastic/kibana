/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiButton,
  EuiFlexItem,
  EuiButtonIcon,
  useGeneratedHtmlId,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
} from '@elastic/eui';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DataView } from '../../../../../../../src/plugins/data_views/public';
import { setFullTimeRange } from './full_time_range_selector_service';

interface Props {
  dataView: DataView;
  query: QueryDslQueryContainer;
  disabled: boolean;
  callback?: (a: any) => void;
}

// Component for rendering a button which automatically sets the range of the time filter
// to the time range of data in the index(es) mapped to the supplied Kibana index pattern or query.
export const FullTimeRangeSelector: FC<Props> = ({ dataView, query, disabled, callback }) => {
  // wrapper around setFullTimeRange to allow for the calling of the optional callBack prop
  async function setRange(i: DataView, q: QueryDslQueryContainer, excludeFrozenData = true) {
    const fullTimeRange = await setFullTimeRange(i, q, excludeFrozenData);
    if (typeof callback === 'function') {
      callback(fullTimeRange);
    }
  }

  const [isPopoverOpen, setPopover] = useState(false);

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const items = [
    <EuiContextMenuItem
      key="include-frozen"
      onClick={() => {
        setRange(dataView, query, false);
        closePopover();
      }}
    >
      <FormattedMessage
        id="xpack.ml.fullTimeRangeSelector.useFullDataMenuLabel"
        defaultMessage="Use full data"
        values={{
          dataViewTitle: dataView.title,
        }}
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="exclude-frozen"
      onClick={() => {
        setRange(dataView, query, true);
        closePopover();
      }}
    >
      <FormattedMessage
        id="xpack.ml.fullTimeRangeSelector.useFullNonFrozenDataMenuLabel"
        defaultMessage="Use full non-frozen data"
      />
    </EuiContextMenuItem>,
  ];

  return (
    <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
      <EuiButton
        isDisabled={disabled}
        onClick={() => setRange(dataView, query, true)}
        data-test-subj="mlButtonUseFullData"
      >
        <FormattedMessage
          id="xpack.ml.fullTimeRangeSelector.useFullDataButtonLabel"
          defaultMessage="Use full non-frozen {dataViewTitle} data"
          values={{
            dataViewTitle: dataView.title,
          }}
        />
      </EuiButton>
      <EuiFlexItem grow={false}>
        <EuiPopover
          id={'mlFullTimeRangeSelectorOption'}
          button={
            <EuiButtonIcon
              display="base"
              size="m"
              iconType="boxesVertical"
              aria-label="More"
              onClick={onButtonClick}
            />
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downRight"
        >
          <EuiContextMenuPanel size="s" items={items} />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
