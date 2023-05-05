/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiTitle,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';
import cytoscape from 'cytoscape';
import React, {
  CSSProperties,
  MouseEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { i18n } from '@kbn/i18n';
import { SERVICE_NAME, SPAN_TYPE } from '../../../../../common/es_fields/apm';
import { Environment } from '../../../../../common/environment_rt';
import { useTheme } from '../../../../hooks/use_theme';
import { useTraceExplorerEnabledSetting } from '../../../../hooks/use_trace_explorer_enabled_setting';
import { CytoscapeContext } from '../cytoscape';
import { getAnimationOptions, popoverWidth } from '../cytoscape_options';
import { DependencyContents } from './dependency_contents';
import { EdgeContents } from './edge_contents';
import { ExternalsListContents } from './externals_list_contents';
import { ResourceContents } from './resource_contents';
import { ServiceContents } from './service_contents';

function getContentsComponent(
  selectedElementData:
    | cytoscape.NodeDataDefinition
    | cytoscape.EdgeDataDefinition,
  isTraceExplorerEnabled: boolean
) {
  if (
    selectedElementData.groupedConnections &&
    Array.isArray(selectedElementData.groupedConnections)
  ) {
    return ExternalsListContents;
  }
  if (selectedElementData[SERVICE_NAME]) {
    return ServiceContents;
  }
  if (selectedElementData[SPAN_TYPE] === 'resource') {
    return ResourceContents;
  }

  if (
    isTraceExplorerEnabled &&
    selectedElementData.source &&
    selectedElementData.target
  ) {
    return EdgeContents;
  }

  return DependencyContents;
}

export interface ContentsProps {
  elementData: cytoscape.NodeDataDefinition | cytoscape.ElementDataDefinition;
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  onFocusClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}

interface PopoverProps {
  focusedServiceName?: string;
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
}

export function Popover({
  focusedServiceName,
  environment,
  kuery,
  start,
  end,
}: PopoverProps) {
  return null;
}
