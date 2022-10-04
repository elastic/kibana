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
  EuiButtonEmpty,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useRecentlyViewedMonitors } from './use_recently_viewed_monitors';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { useMonitorName } from './use_monitor_name';

export const MonitorSelector = () => {
  const [options, setOptions] = useState<EuiSelectableOption[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { basePath } = useSyntheticsSettingsContext();

  const { values, loading } = useMonitorName({ search: searchValue });

  const recentlyViewed = useRecentlyViewedMonitors();

  useEffect(() => {
    let newOptions: EuiSelectableOption[] = [];
    if (recentlyViewed.length > 0 && !searchValue) {
      const otherMonitors = values.filter((value) =>
        recentlyViewed.every((recent) => recent.key !== value.key)
      );

      if (otherMonitors.length > 0) {
        newOptions.push({ key: 'monitors', label: OTHER_MONITORS, isGroupLabel: true });
      }

      newOptions = [...newOptions, ...otherMonitors];

      setOptions([...recentlyViewed, ...newOptions]);
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
          }}
          options={options}
          onChange={(selectedOptions) => {
            setOptions(selectedOptions);
            closePopover();
          }}
          singleSelection={true}
          listProps={{
            showIcons: false,
          }}
          renderOption={(option, search) => (
            <EuiLink href={`${basePath}/app/synthetics/monitor/${option.key}`}>
              <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
            </EuiLink>
          )}
          noMatchesMessage={NO_RESULT_FOUND}
          emptyMessage={
            <EuiButtonEmpty href={`${basePath}/app/synthetics/add-monitor`}>
              {CREATE_NEW_MONITOR}
            </EuiButtonEmpty>
          }
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

const CREATE_NEW_MONITOR = i18n.translate('xpack.synthetics.monitorSummary.createNewMonitor', {
  defaultMessage: 'Create new monitor',
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

const NO_OTHER_MONITORS_EXISTS = i18n.translate('xpack.synthetics.monitorSummary.noOtherMonitors', {
  defaultMessage: 'No other monitors exist.',
});
