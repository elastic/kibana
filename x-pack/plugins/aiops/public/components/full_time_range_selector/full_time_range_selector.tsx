/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { TimefilterContract } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-plugin/common';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiRadioGroup,
  EuiRadioGroupOption,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAiOpsKibana } from '../../kibana_context';
import { setFullTimeRange } from './full_time_range_selector_service';
import { AIOPS_FROZEN_TIER_PREFERENCE, useStorage } from '../../hooks/use_storage';

interface Props {
  timefilter: TimefilterContract;
  dataView: DataView;
  disabled: boolean;
  query?: QueryDslQueryContainer;
  callback?: (a: any) => void;
}

const FROZEN_TIER_PREFERENCE = {
  EXCLUDE: 'exclude-frozen',
  INCLUDE: 'include-frozen',
} as const;

type FrozenTierPreference = typeof FROZEN_TIER_PREFERENCE[keyof typeof FROZEN_TIER_PREFERENCE];

export const FullTimeRangeSelector: FC<Props> = ({
  timefilter,
  dataView,
  query,
  disabled,
  callback,
}) => {
  const {
    services: {
      notifications: { toasts },
    },
  } = useAiOpsKibana();

  // wrapper around setFullTimeRange to allow for the calling of the optional callBack prop
  const setRange = useCallback(
    async (i: DataView, q?: QueryDslQueryContainer, excludeFrozenData?: boolean) => {
      try {
        const fullTimeRange = await setFullTimeRange(timefilter, i, q, excludeFrozenData, toasts);
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
    },
    [callback, timefilter, toasts]
  );

  const [isPopoverOpen, setPopover] = useState(false);

  const [frozenDataPreference, setFrozenDataPreference] = useStorage<FrozenTierPreference>(
    AIOPS_FROZEN_TIER_PREFERENCE,
    // By default we will exclude frozen data tier
    FROZEN_TIER_PREFERENCE.EXCLUDE
  );

  const setPreference = useCallback(
    (id: string) => {
      setFrozenDataPreference(id as FrozenTierPreference);
      setRange(dataView, query, id === FROZEN_TIER_PREFERENCE.EXCLUDE);
      closePopover();
    },
    [dataView, query, setFrozenDataPreference, setRange]
  );

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const sortOptions: EuiRadioGroupOption[] = useMemo(() => {
    return [
      {
        id: FROZEN_TIER_PREFERENCE.EXCLUDE,
        label: i18n.translate(
          'xpack.aiOps.index.fullTimeRangeSelector.useFullDataExcludingFrozenMenuLabel',
          {
            defaultMessage: 'Exclude frozen data tier',
          }
        ),
      },
      {
        id: FROZEN_TIER_PREFERENCE.INCLUDE,
        label: i18n.translate(
          'xpack.aiOps.index.fullTimeRangeSelector.useFullDataIncludingFrozenMenuLabel',
          {
            defaultMessage: 'Include frozen data tier',
          }
        ),
      },
    ];
  }, []);

  const popoverContent = useMemo(
    () => (
      <EuiPanel>
        <EuiRadioGroup
          options={sortOptions}
          idSelected={frozenDataPreference}
          onChange={setPreference}
          compressed
        />
      </EuiPanel>
    ),
    [sortOptions, frozenDataPreference, setPreference]
  );

  const buttonTooltip = useMemo(
    () =>
      frozenDataPreference === FROZEN_TIER_PREFERENCE.EXCLUDE ? (
        <FormattedMessage
          id="xpack.aiops.fullTimeRangeSelector.useFullDataExcludingFrozenButtonTooltip"
          defaultMessage="Use full range of data excluding frozen data tier."
        />
      ) : (
        <FormattedMessage
          id="xpack.aiops.fullTimeRangeSelector.useFullDataIncludingFrozenButtonTooltip"
          defaultMessage="Use full range of data including frozen data tier, which might have slower search results."
        />
      ),
    [frozenDataPreference]
  );

  return (
    <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
      <EuiToolTip content={buttonTooltip}>
        <EuiButton
          isDisabled={disabled}
          onClick={() => setRange(dataView, query, true)}
          data-test-subj="aiopsExplainLogRatesSpikeButtonUseFullData"
        >
          <FormattedMessage
            id="xpack.aiOps.index.fullTimeRangeSelector.useFullDataButtonLabel"
            defaultMessage="Use full data"
          />
        </EuiButton>
      </EuiToolTip>
      <EuiFlexItem grow={false}>
        <EuiPopover
          id={'mlFullTimeRangeSelectorOption'}
          button={
            <EuiButtonIcon
              display="base"
              size="m"
              iconType="boxesVertical"
              aria-label={i18n.translate(
                'xpack.aiOps.index.fullTimeRangeSelector.moreOptionsButtonAriaLabel',
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
          {popoverContent}
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
