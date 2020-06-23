/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiOutsideClickDetector,
  EuiInMemoryTable,
  EuiSpacer,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { xorBy } from 'lodash/fp';
import styled from 'styled-components';

import { RowRendererId } from '../../../../common/types/timeline';
// import { rowRenderers } from '../timeline/body/renderers';

import { FieldBrowserProps } from './types';

const FieldsBrowserContainer = styled.div<{ width: number }>`
  background-color: ${({ theme }) => theme.eui.euiColorLightestShade};
  border: ${({ theme }) => theme.eui.euiBorderWidthThin} solid
    ${({ theme }) => theme.eui.euiColorMediumShade};
  border-radius: ${({ theme }) => theme.eui.euiBorderRadius};
  left: 0;
  position: absolute;
  top: calc(100% + ${({ theme }) => theme.eui.euiSize});
  width: ${({ width }) => width}px;
  z-index: 9990;
`;
FieldsBrowserContainer.displayName = 'FieldsBrowserContainer';

const CloseButtonIcon = styled(EuiButtonIcon)`
  position: absolute;
  right: 0;
  top: 0;
`;

interface RowRendererOption {
  id: RowRendererId;
  name: string;
  description: string;
  example?: React.ReactNode;
}

type Props = Pick<FieldBrowserProps, 'height' | 'timelineId' | 'width'> & {
  excludedRowRendererIds: RowRendererId[];
  onOutsideClick: () => void;
  setExcludedRowRendererIds: (excludedRowRendererIds: RowRendererId[]) => void;
};

/**
 * This component has no internal state, but it uses lifecycle methods to
 * set focus to the search input, scroll to the selected category, etc
 */
const FieldsBrowserComponent: React.FC<Props> = ({
  excludedRowRendererIds = [],
  setExcludedRowRendererIds,
  onOutsideClick,
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
  ];

  const search = {
    box: {
      incremental: true,
      schema: true,
    },
  };

  const renderers: RowRendererOption[] = [
    {
      id: 'auditd',
      name: 'Auditd',
      description: 'Auditd Row Renderer',
    },
    {
      id: 'auditd_file',
      name: 'Auditd File',
      description: 'Auditd Row Renderer',
    },
    {
      id: 'system',
      name: 'System',
      description: 'System Row Renderer',
    },

    {
      id: 'system_endgame_process',
      name: 'System Endgame Process',
      description: 'Endgame Process Row Renderer',
    },

    {
      id: 'system_fin',
      name: 'System FIM',
      description: 'FIM Row Renderer',
    },

    {
      id: 'system_file',
      name: 'System File',
      description: 'System File Row Renderer',
    },

    {
      id: 'system_socket',
      name: 'System Socket',
      description: 'Auditd Row Renderer',
    },

    {
      id: 'system_security_event',
      name: 'System Security Event',
      description: 'Auditd Row Renderer',
    },

    {
      id: 'system_dns',
      name: 'System DNS',
      description: 'Auditd Row Renderer',
    },
    {
      id: 'suricata',
      name: 'Suricata',
      description: 'Auditd Row Renderer',
    },
    {
      id: 'zeek',
      name: 'Zeek',
      description: 'Auditd Row Renderer',
    },
    {
      id: 'netflow',
      name: 'Netflow',
      description: 'Auditd Row Renderer',
    },
  ];

  const notExcludedRowRenderers = useMemo(() => {
    if (excludedRowRendererIds.includes('all')) return [];

    console.error('test', excludedRowRendererIds);

    return renderers;
    // return renderers.filter((renderer) => excludedRowRendererIds.includes(renderer.id));
  }, [excludedRowRendererIds, renderers]);

  const selectionValue = {
    selectable: () => true,
    selectableMessage: () => '',
    onSelectionChange: (selection: RowRendererOption[]) => {
      if (!selection || !selection.length) return setExcludedRowRendererIds(['all']);

      const excludedRowRenderers = xorBy('id', renderers, selection);

      setExcludedRowRendererIds(excludedRowRenderers.map((rowRenderer) => rowRenderer.id));
    },
    initialSelected: notExcludedRowRenderers,
  };

  const handleDisableAll = useCallback(() => setExcludedRowRendererIds(['all']), [
    setExcludedRowRendererIds,
  ]);
  const handleEnableAll = useCallback(() => setExcludedRowRendererIds([]), [
    setExcludedRowRendererIds,
  ]);

  return (
    <EuiOutsideClickDetector
      data-test-subj="outside-click-detector"
      onOutsideClick={onOutsideClick}
      isDisabled={false}
    >
      <FieldsBrowserContainer data-test-subj="fields-browser-container" width={width}>
        <CloseButtonIcon color="text" onClick={onOutsideClick} iconType="cross" />

        <EuiModalHeader>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            direction="row"
            gutterSize="none"
          >
            <EuiFlexItem grow={false}>
              <EuiModalHeaderTitle>{'Customize Row Renderers'}</EuiModalHeaderTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutter="xs">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty data-test-subj="disable-all" onClick={handleDisableAll}>
                    {'Disable All'}
                  </EuiButtonEmpty>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiButton fill data-test-subj="enable-all" onClick={handleEnableAll}>
                    {'Enable All'}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalHeader>

        <EuiSpacer />

        <EuiModalBody>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiInMemoryTable
                items={renderers}
                itemId="id"
                columns={columns}
                search={search}
                sorting={true}
                isSelectable={true}
                selection={selectionValue}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalBody>
      </FieldsBrowserContainer>
    </EuiOutsideClickDetector>
  );
};

export const RowRenderersBrowser = React.memo(FieldsBrowserComponent);
