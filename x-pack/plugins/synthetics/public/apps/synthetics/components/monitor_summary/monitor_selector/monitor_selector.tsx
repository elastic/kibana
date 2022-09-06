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
    setOptions([...recentlyViewed, ...values]);
  }, [recentlyViewed, values]);

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
        <EuiPopoverTitle paddingSize="s">Go to monitor</EuiPopoverTitle>
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
            <EuiLink href={`${basePath}/app/synthetics/monitor/${option.id}`}>
              <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
            </EuiLink>
          )}
          noMatchesMessage={NO_RESULT_FOUND}
        >
          {(list, search) => (
            <div style={{ width: 240 }}>
              <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </Fragment>
  );
};

const NO_RESULT_FOUND = i18n.translate('xpack.synthetics.monitorSummary.noResultsFound', {
  defaultMessage: 'No monitors found. Try modifying your query.',
});

const PLACEHOLDER = i18n.translate('xpack.synthetics.monitorSummary.placeholderSearch', {
  defaultMessage: 'Monitor name or tag',
});

const SELECT_MONITOR = i18n.translate('xpack.synthetics.monitorSummary.selectMonitor', {
  defaultMessage: 'Select a different monitor to view its details',
});
