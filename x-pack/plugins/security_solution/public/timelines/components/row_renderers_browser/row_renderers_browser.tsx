/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiOutsideClickDetector, EuiInMemoryTable } from '@elastic/eui';
import React, {  useCallback, useMemo, useState, useRef } from 'react';
import { noop, xorBy } from 'lodash/fp';
import styled from 'styled-components';

import { RowRendererId } from '../../../../common/types/timeline';
import { rowRenderers } from '../timeline/body/renderers';
import { BrowserFields } from '../../../common/containers/source';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';

import { Header } from './header';
import { PANES_FLEX_GROUP_WIDTH } from './helpers';
import { FieldBrowserProps, OnHideFieldBrowser } from './types';

const FieldsBrowserContainer = styled.div<{ width: number }>`
  background-color: ${({ theme }) => theme.eui.euiColorLightestShade};
  border: ${({ theme }) => theme.eui.euiBorderWidthThin} solid
    ${({ theme }) => theme.eui.euiColorMediumShade};
  border-radius: ${({ theme }) => theme.eui.euiBorderRadius};
  left: 0;
  padding: ${({ theme }) => theme.eui.paddingSizes.s} ${({ theme }) => theme.eui.paddingSizes.s}
    ${({ theme }) => theme.eui.paddingSizes.m};
  position: absolute;
  top: calc(100% + ${({ theme }) => theme.eui.euiSize});
  width: ${({ width }) => width}px;
  z-index: 9990;
`;
FieldsBrowserContainer.displayName = 'FieldsBrowserContainer';

const PanesFlexGroup = styled(EuiFlexGroup)`
  width: ${PANES_FLEX_GROUP_WIDTH}px;
`;
PanesFlexGroup.displayName = 'PanesFlexGroup';

interface RowRendererOption {
  id: RowRendererId;
  name: string;
  description: string;
  example: React.ReactNode;
}

type Props = Pick<
  FieldBrowserProps,
  | 'browserFields'
  | 'isEventViewer'
  | 'height'
  | 'onFieldSelected'
  | 'onUpdateColumns'
  | 'timelineId'
  | 'width'
> & {
  /**
   * The current timeline column headers
   */
  columnHeaders: ColumnHeaderOptions[];
  excludedRowRendererIds: RowRendererId[];
  /**
   * A map of categoryId -> metadata about the fields in that category,
   * filtered such that the name of every field in the category includes
   * the filter input (as a substring).
   */
  filteredBrowserFields: BrowserFields;
  /**
   * When true, a busy spinner will be shown to indicate the field browser
   * is searching for fields that match the specified `searchInput`
   */
  isSearching: boolean;
  /** The text displayed in the search input */
  searchInput: string;
  /**
   * The category selected on the left-hand side of the field browser
   */
  selectedCategoryId: string;
  /**
   * Invoked when the user clicks on the name of a category in the left-hand
   * side of the field browser
   */
  onCategorySelected: (categoryId: string) => void;
  /**
   * Hides the field browser when invoked
   */
  onHideFieldBrowser: OnHideFieldBrowser;
  /**
   * Invoked when the user clicks outside of the field browser
   */
  onOutsideClick: () => void;
  /**
   * Invoked when the user types in the search input
   */
  onSearchInputChange: (newSearchInput: string) => void;
  /**
   * Invoked to add or remove a column from the timeline
   */
  toggleColumn: (column: ColumnHeaderOptions) => void;
  setExcludedRowRendererIds: (excludedRowRendererIds: RowRendererId[]) => void;
};

/**
 * This component has no internal state, but it uses lifecycle methods to
 * set focus to the search input, scroll to the selected category, etc
 */
const FieldsBrowserComponent: React.FC<Props> = ({
  excludedRowRendererIds = [],
  filteredBrowserFields,
  isEventViewer,
  setExcludedRowRendererIds,
  onFieldSelected,
  onOutsideClick,
  timelineId,
  width,
}) => {
  const columns = [
    {
      field: 'name',
      name: 'Name',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'description',
      name: 'Description',
      truncateText: true,
    },
    {
      field: 'category',
      name: 'Category',
      truncateText: true,
    },
    {
      field: 'example',
      name: 'Example',
      render: () => <div>EXAMPLE</div>,
    },
  ];

  const search = {
    box: {
      incremental: true,
      schema: true,
    },
    // filters: !filters
    //   ? undefined
    //   : [
    //       {
    //         type: 'is',
    //         field: 'online',
    //         name: 'Online',
    //         negatedName: 'Offline',
    //       },
    //       {
    //         type: 'field_value_selection',
    //         field: 'nationality',
    //         name: 'Nationality',
    //         multiSelect: false,
    //         options: [],
    //       },
    //     ],
  };

  const renderers: RowRendererOption[] = [
    {
      id: 'auditd',
      name: 'Auditd',
      description: 'Auditd Row Renderer',
      example: () => <></>,
    },
    {
      id: 'auditd_file',
      name: 'Auditd File',
      description: 'Auditd Row Renderer',
      example: () => <></>,
    },
    {
      id: 'system',
      name: 'System',
      description: 'System Row Renderer',
      example: () => <></>,
    },

    {
      id: 'system_endgame_process',
      name: 'System Endgame Process',
      description: 'Endgame Process Row Renderer',
      example: () => <></>,
    },

    {
      id: 'system_fin',
      name: 'System FIM',
      description: 'FIM Row Renderer',
      example: () => <></>,
    },

    {
      id: 'system_file',
      name: 'System File',
      description: 'System File Row Renderer',
      example: () => <></>,
    },

    {
      id: 'system_socket',
      name: 'System Socket',
      description: 'Auditd Row Renderer',
      example: () => <></>,
    },

    {
      id: 'system_security_event',
      name: 'System Security Event',
      description: 'Auditd Row Renderer',
      example: () => <></>,
    },

    {
      id: 'system_dns',
      name: 'System DNS',
      description: 'Auditd Row Renderer',
      example: () => <></>,
    },
    {
      id: 'suricata',
      name: 'Suricata',
      description: 'Auditd Row Renderer',
      example: () => <></>,
    },
    {
      id: 'zeek',
      name: 'Zeek',
      description: 'Auditd Row Renderer',
      example: () => <></>,
    },
    {
      id: 'netflow',
      name: 'Netflow',
      description: 'Auditd Row Renderer',
      example: () => <></>,
    },
  ];

  const notExcludedRowRenderers = useMemo(() => {
    if (excludedRowRendererIds.includes('all')) return [];

    return renderers;
    // return renderers.filter((renderer) => excludedRowRendererIds.includes(renderer.id));
  }, [excludedRowRendererIds, renderers]);

  const selectionValue = {
    selectable: () => true,
    selectableMessage: () => '',
    onSelectionChange: (selection) => {
      console.error('selection', selection);

      if (!selection || !selection.length) return setExcludedRowRendererIds(['all']);

      const excludedRowRenderers = xorBy('id', renderers, selection);

      setExcludedRowRendererIds(excludedRowRenderers.map((rowRenderer) => rowRenderer.id));
    },
    initialSelected: notExcludedRowRenderers,
  };

  console.error('rowRenderers', rowRenderers);

  const tableRef = useRef();

  return (
    <EuiOutsideClickDetector
      data-test-subj="outside-click-detector"
      onOutsideClick={onFieldSelected != null ? noop : onOutsideClick}
      isDisabled={false}
    >
      <FieldsBrowserContainer data-test-subj="fields-browser-container" width={width}>
        <Header
          data-test-subj="header"
          filteredBrowserFields={filteredBrowserFields}
          isEventViewer={isEventViewer}
          onOutsideClick={onOutsideClick}
          timelineId={timelineId}
        />

        <EuiInMemoryTable
          ref={tableRef}
          items={renderers}
          itemId="id"
          columns={columns}
          search={search}
          sorting={true}
          isSelectable={true}
          selection={selectionValue}
        />
      </FieldsBrowserContainer>
    </EuiOutsideClickDetector>
  );
};

export const RowRenderersBrowser = React.memo(FieldsBrowserComponent);
