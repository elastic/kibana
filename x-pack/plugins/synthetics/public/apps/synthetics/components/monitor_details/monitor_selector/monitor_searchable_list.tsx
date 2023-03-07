/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiHighlight,
  EuiLink,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableOption,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { useRecentlyViewedMonitors } from './use_recently_viewed_monitors';
import { useSelectedLocation } from '../hooks/use_selected_location';
import { useMonitorName } from './use_monitor_name';
import { AddMonitorLink } from '../../common/links/add_monitor';
import { useSyntheticsSettingsContext } from '../../../contexts';

type MonitorOption = EuiSelectableOption & {
  locationIds?: string[];
};

export const MonitorSearchableList = ({ closePopover }: { closePopover: () => void }) => {
  const history = useHistory();
  const recentlyViewed = useRecentlyViewedMonitors();

  const [options, setOptions] = useState<MonitorOption[]>([]);
  const [searchValue, setSearchValue] = useState('');

  const selectedLocation = useSelectedLocation();

  const { basePath } = useSyntheticsSettingsContext();

  const { values, loading } = useMonitorName({ search: searchValue });

  useEffect(() => {
    const newOptions: MonitorOption[] = [];
    if (recentlyViewed.length > 0 && !searchValue) {
      const otherMonitors = values.filter((value) =>
        recentlyViewed.every((recent) => recent.key !== value.key)
      ) as MonitorOption[];

      if (otherMonitors.length > 0) {
        newOptions.push({
          key: 'monitors',
          label: OTHER_MONITORS,
          isGroupLabel: true,
          locationIds: [],
        });
      }

      setOptions([...recentlyViewed, ...newOptions, ...otherMonitors]);
    } else {
      setOptions(values);
    }
  }, [recentlyViewed, searchValue, values]);

  const getLocationId = (option: MonitorOption) => {
    if (option.locationIds?.includes(selectedLocation?.id ?? '')) {
      return selectedLocation?.id;
    }
    return option.locationIds?.[0];
  };

  return (
    <EuiSelectable<MonitorOption>
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
          history.push(`/monitor/${option.key}?locationId=${getLocationId(option)}`);
        }
        closePopover();
      }}
      singleSelection={true}
      listProps={{
        showIcons: false,
      }}
      renderOption={(option, search) => (
        <EuiLink
          href={`${basePath}/app/synthetics/monitor/${option.key}?locationId=${getLocationId(
            option
          )}`}
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
  );
};

const LOADING_MONITORS = i18n.translate('xpack.synthetics.monitorSummary.loadingMonitors', {
  defaultMessage: 'Loading monitors',
});

const NO_OTHER_MONITORS_EXISTS = i18n.translate('xpack.synthetics.monitorSummary.noOtherMonitors', {
  defaultMessage: 'No other monitors exist.',
});

const NO_RESULT_FOUND = i18n.translate('xpack.synthetics.monitorSummary.noResultsFound', {
  defaultMessage: 'No monitors found. Try modifying your query.',
});

const PLACEHOLDER = i18n.translate('xpack.synthetics.monitorSummary.placeholderSearch', {
  defaultMessage: 'Monitor name or tag',
});

const OTHER_MONITORS = i18n.translate('xpack.synthetics.monitorSummary.otherMonitors', {
  defaultMessage: 'Other monitors',
});
