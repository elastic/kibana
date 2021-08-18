/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiPopover,
  EuiSelectable,
  EuiSelectableOption,
  EuiTitle,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

export type ViewSelection = 'gridView' | 'eventRenderedView';

const ContainerEuiSelectable = styled.div`
  width: 300px;
  .euiSelectableListItem__text {
    white-space: pre-wrap !important;
    line-height: normal;
  }
`;

const gridView = i18n.translate('xpack.timelines.alerts.summaryView.gridView.label', {
  defaultMessage: 'Grid view',
});

const eventRenderedView = i18n.translate(
  'xpack.timelines.alerts.summaryView.eventRendererView.label',
  {
    defaultMessage: 'Event rendered view',
  }
);

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
      const selected = opts.filter((i) => i.checked === 'on');
      if (selected.length > 0) {
        onViewChange((selected[0]?.key ?? 'gridView') as ViewSelection);
      }
      setIsPopoverOpen(false);
    },
    [onViewChange]
  );

  const button = useMemo(
    () => (
      <EuiButtonEmpty
        iconType="arrowDown"
        iconSide="right"
        iconSize="s"
        onClick={onButtonClick}
        size="xs"
        flush="both"
        style={{ fontWeight: 'normal' }}
      >
        {viewSelected === 'gridView' ? gridView : eventRenderedView}
      </EuiButtonEmpty>
    ),
    [onButtonClick, viewSelected]
  );

  const options = useMemo(
    () => [
      {
        label: gridView,
        key: 'gridView',
        checked: (viewSelected === 'gridView' ? 'on' : undefined) as EuiSelectableOption['checked'],
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
        label: eventRenderedView,
        key: 'eventRenderedView',
        checked: (viewSelected === 'eventRenderedView'
          ? 'on'
          : undefined) as EuiSelectableOption['checked'],
        meta: [
          {
            text: i18n.translate(
              'xpack.timelines.alerts.summaryView.options.summaryView.description',
              {
                defaultMessage: 'View a rendering of the event flow for each alert',
              }
            ),
          },
        ],
      },
    ],
    [viewSelected]
  );

  const renderOption = useCallback((option) => {
    return (
      <>
        <EuiTitle size="xxs">
          <h6>{option.label}</h6>
        </EuiTitle>
        <EuiTextColor color="subdued">
          <small>{option.meta[0].text}</small>
        </EuiTextColor>
      </>
    );
  }, []);

  const listProps = useMemo(
    () => ({
      rowHeight: 80,
      showIcons: true,
    }),
    []
  );

  return (
    <EuiPopover
      panelPaddingSize="none"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <ContainerEuiSelectable>
        <EuiSelectable
          options={options}
          onChange={onChangeSelectable}
          renderOption={renderOption}
          searchable={false}
          height={160}
          listProps={listProps}
          singleSelection={true}
        >
          {(list) => list}
        </EuiSelectable>
      </ContainerEuiSelectable>
    </EuiPopover>
  );
};

export const SummaryViewSelector = React.memo(SummaryViewSelectorComponent);
