/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiLink,
  EuiPopover,
  EuiSelectable,
  EuiText,
  type EuiSelectableOption,
} from '@elastic/eui';
import { RollupInterval } from '@kbn/apm-data-access-plugin/common/rollup';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useApmPluginContext } from '../../context/apm_plugin/use_apm_plugin_context';

interface Props {
  rollupInterval?: RollupInterval;
  onRollupIntervalChange: (rollupInterval: RollupInterval) => void;
}

const defaultRollupInterval = RollupInterval.OneMinute;

export function TableRollupOptions({
  rollupInterval = defaultRollupInterval,
  onRollupIntervalChange,
}: Props) {
  const { docLinks } = useApmPluginContext().core;

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const selectedRollup = rollupInterval ?? defaultRollupInterval;

  const rollupOptions = useMemo<EuiSelectableOption[]>(() => {
    return [
      {
        key: RollupInterval.OneMinute,
        label: RollupInterval.OneMinute,
        append: i18n.translate('xpack.apm.tableRollupOptions.oneMinuteAppendDropDownOptionLabel', {
          defaultMessage: '1 minute',
        }),
        checked: selectedRollup === RollupInterval.OneMinute ? 'on' : undefined,
      },
      {
        key: RollupInterval.TenMinutes,
        label: RollupInterval.TenMinutes,
        append: i18n.translate('xpack.apm.tableRollupOptions.tenMinutesAppendDropDownOptionLabel', {
          defaultMessage: '10 minutes',
        }),
        checked: selectedRollup === RollupInterval.TenMinutes ? 'on' : undefined,
      },
      {
        key: RollupInterval.SixtyMinutes,
        label: RollupInterval.SixtyMinutes,
        append: i18n.translate(
          'xpack.apm.tableRollupOptions.sixtyMinutesAppendDropDownOptionLabel',
          {
            defaultMessage: '60 minutes',
          }
        ),
        checked: selectedRollup === RollupInterval.SixtyMinutes ? 'on' : undefined,
      },
      {
        key: RollupInterval.None,
        label: RollupInterval.None,
        checked: selectedRollup === RollupInterval.None ? 'on' : undefined,
        append: i18n.translate('xpack.apm.tableRollupOptions.noneAppendDropDownOptionLabel', {
          defaultMessage: 'Use raw transaction data instead of metrics',
        }),
      },
    ];
  }, [selectedRollup]);

  const handleSelectableChange = useCallback(
    (options: EuiSelectableOption[]) => {
      const selectedOption = options.find((option) => option.checked === 'on');

      if (selectedOption?.key) {
        onRollupIntervalChange(selectedOption.key as RollupInterval);
        setIsPopoverOpen(false);
      }
    },
    [onRollupIntervalChange]
  );

  return (
    <EuiPopover
      id="apm-table-options-popover"
      aria-label={i18n.translate('xpack.apm.tableOptions.rollup.popoverAriaLabel', {
        defaultMessage: 'Table rollup options',
      })}
      button={
        <EuiButtonEmpty
          size="s"
          iconType="controlsHorizontal"
          onClick={() => setIsPopoverOpen((current) => !current)}
          data-test-subj="apmTableOptionsButton"
          style={{ whiteSpace: 'nowrap' }}
        >
          {i18n.translate('xpack.apm.tableOptions.rollup.buttonLabel', {
            defaultMessage: 'Rollup: {rollupInterval}',
            values: { rollupInterval: selectedRollup },
          })}
        </EuiButtonEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenuPanel
        title={i18n.translate('xpack.apm.tableOptions.rollup.menuTitle', {
          defaultMessage: 'Rollup interval',
        })}
      >
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.apm.tableRollupOptions.helpDescription"
            defaultMessage="Table contents are generated from {link}. Shorter rollup periods provide more accurate data, but may take longer to load."
            values={{
              link: (
                <EuiLink
                  data-test-subj="TableRollupOptionsAggregatedMetricDataLink"
                  external={true}
                  href={docLinks.links.apm.metrics}
                >
                  <FormattedMessage
                    id="xpack.apm.tableRollupOptions.helpLinkText"
                    defaultMessage="aggregated metric data"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>

        <EuiSelectable
          aria-label={i18n.translate('xpack.apm.tableOptions.rollup.selectableAriaLabel', {
            defaultMessage: 'Select rollup interval',
          })}
          singleSelection="always"
          options={rollupOptions}
          onChange={handleSelectableChange}
          data-test-subj="apmTableOptionsRollupSelect"
          searchable={false}
        >
          {(list) => list}
        </EuiSelectable>
      </EuiContextMenuPanel>
    </EuiPopover>
  );
}
