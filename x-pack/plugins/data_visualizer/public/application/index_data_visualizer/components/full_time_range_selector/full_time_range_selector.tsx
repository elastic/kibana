/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { TimefilterContract } from 'src/plugins/data/public';
import { DataView } from 'src/plugins/data/common';

import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { setFullTimeRange } from './full_time_range_selector_service';
import { useDataVisualizerKibana } from '../../../kibana_context';

interface Props {
  timefilter: TimefilterContract;
  indexPattern: DataView;
  disabled: boolean;
  query?: QueryDslQueryContainer;
  callback?: (a: any) => void;
}

// Component for rendering a button which automatically sets the range of the time filter
// to the time range of data in the index(es) mapped to the supplied Kibana data view or query.
export const FullTimeRangeSelector: FC<Props> = ({
  timefilter,
  indexPattern,
  query,
  disabled,
  callback,
}) => {
  const {
    services: {
      notifications: { toasts },
    },
  } = useDataVisualizerKibana();

  // wrapper around setFullTimeRange to allow for the calling of the optional callBack prop
  async function setRange(i: DataView, q?: QueryDslQueryContainer, excludeFrozenData?: boolean) {
    try {
      const fullTimeRange = await setFullTimeRange(timefilter, i, q, excludeFrozenData);
      if (typeof callback === 'function') {
        callback(fullTimeRange);
      }
    } catch (e) {
      toasts.addDanger(
        i18n.translate(
          'xpack.dataVisualizer.index.fullTimeRangeSelector.errorSettingTimeRangeNotification',
          {
            defaultMessage: 'An error occurred setting the time range.',
          }
        )
      );
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
      key="exclude-frozen"
      onClick={() => {
        setRange(indexPattern, query, true);
        closePopover();
      }}
    >
      <FormattedMessage
        id="xpack.dataVisualizer.index.fullTimeRangeSelector.useFullNonFrozenDataMenuLabel"
        defaultMessage="Exclude frozen data tier"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="include-frozen"
      onClick={() => {
        setRange(indexPattern, query, false);
        closePopover();
      }}
    >
      <FormattedMessage
        id="xpack.dataVisualizer.index.fullTimeRangeSelector.useFullDataMenuLabel"
        defaultMessage="Include frozen data tier"
      />
    </EuiContextMenuItem>,
  ];

  return (
    <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
      <EuiButton
        isDisabled={disabled}
        // By default we will exclude frozen data tier
        onClick={() => setRange(indexPattern, query, true)}
        data-test-subj="dataVisualizerButtonUseFullData"
      >
        <FormattedMessage
          id="xpack.dataVisualizer.index.fullTimeRangeSelector.useFullDataButtonLabel"
          defaultMessage="Use full data"
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
              aria-label={i18n.translate(
                'xpack.dataVisualizer.index.fullTimeRangeSelector.moreOptionsButtonAriaLabel',
                {
                  defaultMessage: 'More options',
                }
              )}
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
