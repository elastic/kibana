/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiPopover, EuiSelectable, EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';

export type ViewSelection = 'default' | 'eventRendererView';

interface SummaryViewSelectorProps {
  onViewChange: (viewSelection: ViewSelection) => void;
  viewSelected: ViewSelection;
}

const SummaryViewSelectorComponent = ({ viewSelected, onViewChange }: SummaryViewSelectorProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = useCallback(() => setIsPopoverOpen((currentVal) => !currentVal), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const onChangeSelectable = useCallback(
    (opts: EuiSelectableOption[]) => {
      if (opts.length > 0) {
        onViewChange((opts[0]?.key ?? 'default') as ViewSelection);
      }
    },
    [onViewChange]
  );

  const button = useMemo(
    () => (
      <EuiButtonEmpty iconType="arrowDown" iconSide="right" onClick={onButtonClick}>
        {i18n.translate('xpack.timelines.alerts.summaryView.dropdown.button', {
          defaultMessage: 'Summary view',
        })}
      </EuiButtonEmpty>
    ),
    [onButtonClick]
  );
  const options = useMemo(
    () => [
      {
        label: i18n.translate('xpack.timelines.alerts.summaryView.options.default.label', {
          defaultMessage: 'Data view',
        }),
        key: 'default',
        checked: (viewSelected === 'default' ? 'on' : 'off') as EuiSelectableOption['checked'],
        meta: [
          {
            text: i18n.translate('xpack.timelines.alerts.summaryView.options.default.description', {
              defaultMessage:
                'View as tabular data with the ability to group and sort by specific fields',
            }),
          },
        ],
      },
      {
        label: i18n.translate(
          'xpack.timelines.alerts.summaryView.options.eventRendererView.label',
          {
            defaultMessage: 'Summary view',
          }
        ),
        key: 'eventRendererView',
        checked: (viewSelected === 'eventRendererView'
          ? 'on'
          : 'off') as EuiSelectableOption['checked'],
        meta: [
          {
            text: i18n.translate(
              'xpack.timelines.alerts.summaryView.options.summaryView.description',
              {
                defaultMessage: 'View the event summary for each alert',
              }
            ),
          },
        ],
      },
    ],
    [viewSelected]
  );

  return (
    <EuiPopover
      panelPaddingSize="none"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <EuiSelectable
        aria-label="Basic example"
        options={options}
        onChange={onChangeSelectable}
        singleSelection={true}
      >
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
};

export const SummaryViewSelector = React.memo(SummaryViewSelectorComponent);
