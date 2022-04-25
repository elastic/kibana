/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiButton,
  EuiFlexItem,
  EuiButtonIcon,
  EuiRadioGroup,
  EuiPanel,
  EuiToolTip,
  EuiPopover,
  EuiRadioGroupOption,
} from '@elastic/eui';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { setFullTimeRange } from './full_time_range_selector_service';
import { useStorage } from '../../contexts/ml/use_storage';
import { ML_FROZEN_TIER_PREFERENCE } from '../../../../common/types/storage';

interface Props {
  dataView: DataView;
  query: QueryDslQueryContainer;
  disabled: boolean;
  callback?: (a: any) => void;
}

const FROZEN_TIER_PREFERENCE = {
  EXCLUDE: 'exclude-frozen',
  INCLUDE: 'include-frozen',
} as const;

type FrozenTierPreference = typeof FROZEN_TIER_PREFERENCE[keyof typeof FROZEN_TIER_PREFERENCE];

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
  const [frozenDataPreference, setFrozenDataPreference] = useStorage<FrozenTierPreference>(
    ML_FROZEN_TIER_PREFERENCE,
    FROZEN_TIER_PREFERENCE.EXCLUDE
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
          'xpack.ml.fullTimeRangeSelector.useFullDataExcludingFrozenMenuLabel',
          {
            defaultMessage: 'Exclude frozen data tier',
          }
        ),
      },
      {
        id: FROZEN_TIER_PREFERENCE.INCLUDE,
        label: i18n.translate(
          'xpack.ml.fullTimeRangeSelector.useFullDataIncludingFrozenMenuLabel',
          {
            defaultMessage: 'Include frozen data tier',
          }
        ),
      },
    ];
  }, []);

  const setPreference = useCallback((id: string) => {
    setFrozenDataPreference(id as FrozenTierPreference);
    setRange(dataView, query, id === FROZEN_TIER_PREFERENCE.EXCLUDE);
    closePopover();
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
    [frozenDataPreference, sortOptions]
  );

  const buttonTooltip = useMemo(
    () =>
      frozenDataPreference === FROZEN_TIER_PREFERENCE.EXCLUDE ? (
        <FormattedMessage
          id="xpack.ml.fullTimeRangeSelector.useFullDataExcludingFrozenButtonTooltip"
          defaultMessage="Use full range of data excluding frozen data tier."
        />
      ) : (
        <FormattedMessage
          id="xpack.ml.fullTimeRangeSelector.useFullDataIncludingFrozenButtonTooltip"
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
          data-test-subj="mlButtonUseFullData"
        >
          <FormattedMessage
            id="xpack.ml.fullTimeRangeSelector.useFullDataButtonLabel"
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
              aria-label="More"
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
