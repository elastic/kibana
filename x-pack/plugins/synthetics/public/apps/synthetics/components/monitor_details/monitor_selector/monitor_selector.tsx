/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect, useState } from 'react';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiButtonIcon,
  EuiSelectableOption,
  EuiHighlight,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { AddMonitorLink } from '../../common/links/add_monitor';
import { useRecentlyViewedMonitors } from './use_recently_viewed_monitors';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { useMonitorName } from './use_monitor_name';
import { useSelectedLocation } from '../hooks/use_selected_location';

export const MonitorSelector = () => {
  const history = useHistory();

  const [options, setOptions] = useState<EuiSelectableOption[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const selectedLocation = useSelectedLocation();

  const { basePath } = useSyntheticsSettingsContext();

  const { values, loading } = useMonitorName({ search: searchValue });

  const recentlyViewed = useRecentlyViewedMonitors();

  useEffect(() => {
    const newOptions: EuiSelectableOption[] = [];
    if (recentlyViewed.length > 0 && !searchValue) {
      const otherMonitors = values.filter((value) =>
        recentlyViewed.every((recent) => recent.key !== value.key)
      );

      if (otherMonitors.length > 0) {
        newOptions.push({ key: 'monitors', label: OTHER_MONITORS, isGroupLabel: true });
      }

      setOptions([...recentlyViewed, ...newOptions, ...otherMonitors]);
    } else {
      setOptions(values);
    }
  }, [recentlyViewed, searchValue, values]);

  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const button = (
    <EuiButtonIcon iconType="arrowDown" onClick={onButtonClick} aria-label={SELECT_MONITOR} />
  );

  return (
    <Fragment>
      <EuiPopover
        id={'monitorSelector'}
        panelPaddingSize="none"
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
      >
        <EuiPopoverTitle paddingSize="s">{GO_TO_MONITOR}</EuiPopoverTitle>
        <EuiSelectable
          searchable
          isLoading={loading}
          searchProps={{
            placeholder: PLACEHOLDER,
            compressed: true,
            onChange: (val) => setSearchValue(val),
            autoFocus: true,
          }}
          options={options}
          onChange={(selectedOptions) => {
            setOptions(selectedOptions);
            const option = selectedOptions.find((opt) => opt.checked === 'on');
            if (option) {
              history.push(`/monitor/${option.key}?locationId=${selectedLocation?.id}`);
            }
            closePopover();
          }}
          singleSelection={true}
          listProps={{
            showIcons: false,
          }}
          renderOption={(option, search) => (
            <EuiLink
              href={`${basePath}/app/synthetics/monitor/${option.key}?locationId=${selectedLocation?.id}`}
            >
              <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
            </EuiLink>
          )}
          noMatchesMessage={NO_RESULT_FOUND}
          emptyMessage={<AddMonitorLink />}
          loadingMessage={LOADING_MONITORS}
        >
          {(list, search) => (
            <div style={{ width: 280 }}>
              <EuiPopoverTitle paddingSize="s">
                {options.length > 0 || searchValue ? (
                  search
                ) : (
                  <EuiText color="subdued" size="s" className="eui-textCenter">
                    {NO_OTHER_MONITORS_EXISTS}
                  </EuiText>
                )}
              </EuiPopoverTitle>
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </Fragment>
  );
};

const GO_TO_MONITOR = i18n.translate('xpack.synthetics.monitorSummary.goToMonitor', {
  defaultMessage: 'Go to monitor',
});

const NO_RESULT_FOUND = i18n.translate('xpack.synthetics.monitorSummary.noResultsFound', {
  defaultMessage: 'No monitors found. Try modifying your query.',
});

const PLACEHOLDER = i18n.translate('xpack.synthetics.monitorSummary.placeholderSearch', {
  defaultMessage: 'Monitor name or tag',
});

const SELECT_MONITOR = i18n.translate('xpack.synthetics.monitorSummary.selectMonitor', {
  defaultMessage: 'Select a different monitor to view its details',
});

const OTHER_MONITORS = i18n.translate('xpack.synthetics.monitorSummary.otherMonitors', {
  defaultMessage: 'Other monitors',
});

const LOADING_MONITORS = i18n.translate('xpack.synthetics.monitorSummary.loadingMonitors', {
  defaultMessage: 'Loading monitors',
});

const NO_OTHER_MONITORS_EXISTS = i18n.translate('xpack.synthetics.monitorSummary.noOtherMonitors', {
  defaultMessage: 'No other monitors exist.',
});
