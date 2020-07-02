/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { EuiFlexItem, EuiInMemoryTable } from '@elastic/eui';
import React, { useMemo, useCallback } from 'react';
import { xorBy } from 'lodash/fp';
import styled from 'styled-components';

import { RowRendererId } from '../../../../common/types/timeline';
import { FieldBrowserProps } from './types';
import {
  AuditdExample,
  AuditdFileExample,
  NetflowExample,
  SuricataExample,
  SystemExample,
  SystemDnsExample,
  SystemEndgameProcessExample,
  SystemFileExample,
  SystemFimExample,
  SystemSecurityEventExample,
  SystemSocketExample,
  ZeekExample,
} from './examples';

interface RowRendererOption {
  id: RowRendererId;
  name: string;
  description: string;
  example?: React.ReactNode;
}

type Props = Pick<FieldBrowserProps, 'height' | 'timelineId'> & {
  excludedRowRendererIds: RowRendererId[];
  setExcludedRowRendererIds: (excludedRowRendererIds: RowRendererId[]) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StyledEuiInMemoryTable = styled(EuiInMemoryTable as any)`
  .euiTable {
    width: auto;

    .euiTableHeaderCellCheckbox > .euiTableCellContent {
      display: none; // we don't want to display checkbox in the table
    }
  }
`;

const StyledEuiFlexItem = styled(EuiFlexItem)`
  > div {
    padding: 0;

    > div {
      margin: 0;
    }
  }
`;

const ExampleWrapperComponent = (Example?: React.ReactElement) => {
  if (!Example) return;

  return (
    <StyledEuiFlexItem grow={1}>
      <Example />
    </StyledEuiFlexItem>
  );
};

const search = {
  box: {
    incremental: true,
    schema: true,
  },
};

const renderers: RowRendererOption[] = [
  {
    id: RowRendererId.auditd,
    name: 'Auditd',
    description: 'Auditd Row Renderer',
    example: AuditdExample,
  },
  {
    id: RowRendererId.auditd_file,
    name: 'Auditd File',
    description: 'Auditd File Row Renderer',
    example: AuditdFileExample,
  },
  {
    id: RowRendererId.system,
    name: 'System',
    description: 'System Row Renderer',
    example: SystemExample,
  },

  {
    id: RowRendererId.system_endgame_process,
    name: 'System Endgame Process',
    description: 'Endgame Process Row Renderer',
    example: SystemEndgameProcessExample,
  },

  {
    id: RowRendererId.system_fin,
    name: 'System FIM',
    description: 'FIM Row Renderer',
    example: SystemFimExample,
  },
  {
    id: RowRendererId.system_file,
    name: 'System File',
    description: 'System File Row Renderer',
    example: SystemFileExample,
  },
  {
    id: RowRendererId.system_socket,
    name: 'System Socket',
    description: 'System Socket Row Renderer',
    example: SystemSocketExample,
  },

  {
    id: RowRendererId.system_security_event,
    name: 'System Security Event',
    description: 'System Security Event Row Renderer',
    example: SystemSecurityEventExample,
  },

  {
    id: RowRendererId.system_dns,
    name: 'System DNS',
    description: 'System DNS Row Renderer',
    example: SystemDnsExample,
  },

  {
    id: RowRendererId.suricata,
    name: 'Suricata',
    description: 'Suricata Row Renderer',
    example: SuricataExample,
  },
  {
    id: RowRendererId.zeek,
    name: 'Zeek',
    description: 'Zeek Row Renderer',
    example: ZeekExample,
  },
  {
    id: RowRendererId.netflow,
    name: 'Netflow',
    description: 'Netflow Row Renderer',
    example: NetflowExample,
  },
];

const FieldsBrowserComponent: React.FC<Props> = ({
  excludedRowRendererIds = [],
  setExcludedRowRendererIds,
}) => {
  const columns = useMemo(
    () => [
      {
        field: 'name',
        name: 'Name',
        sortable: true,
        truncateText: true,
        width: '15%',
      },
      {
        field: 'description',
        name: 'Description',
        truncateText: true,
        width: '20%',
      },
      {
        field: 'example',
        name: 'Example',
        width: '65%',
        render: ExampleWrapperComponent,
      },
    ],
    []
  );

  const notExcludedRowRenderers = useMemo(() => {
    if (excludedRowRendererIds.includes(RowRendererId.all)) return [];

    return renderers.filter((renderer) => !excludedRowRendererIds.includes(renderer.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectable = useCallback(() => true, []);

  const handleSelectionChange = useCallback(
    (selection: RowRendererOption[]) => {
      if (!selection || !selection.length) return setExcludedRowRendererIds([RowRendererId.all]);

      const excludedRowRenderers = xorBy('id', renderers, selection);

      setExcludedRowRendererIds(excludedRowRenderers.map((rowRenderer) => rowRenderer.id));
    },
    [setExcludedRowRendererIds]
  );

  const selectionValue = useMemo(
    () => ({
      selectable: handleSelectable,
      onSelectionChange: handleSelectionChange,
      initialSelected: notExcludedRowRenderers,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleSelectable, handleSelectionChange]
  );

  return (
    <StyledEuiInMemoryTable
      items={renderers}
      itemId="id"
      columns={columns}
      search={search}
      sorting={true}
      isSelectable={true}
      selection={selectionValue}
    />
  );
};

export const RowRenderersBrowser = React.memo(FieldsBrowserComponent);
