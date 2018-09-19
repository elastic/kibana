/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 *  /!\  These type definitions are temporary until the upstream @elastic/eui
 *       package includes them.
 */

import { EuiToolTipPosition } from '@elastic/eui';
import { Moment } from 'moment';
import { ChangeEventHandler, MouseEventHandler, ReactType, Ref, SFC } from 'react';

declare module '@elastic/eui' {
  export interface EuiBreadcrumbDefinition {
    text: React.ReactNode;
    href?: string;
    onClick?: React.MouseEventHandler<any>;
  }
  type EuiBreadcrumbsProps = CommonProps & {
    responsive?: boolean;
    truncate?: boolean;
    max?: number;
    breadcrumbs: EuiBreadcrumbDefinition[];
  };

  type EuiHeaderProps = CommonProps;
  export const EuiHeader: React.SFC<EuiHeaderProps>;

  export type EuiHeaderSectionSide = 'left' | 'right';
  type EuiHeaderSectionProps = CommonProps & {
    side?: EuiHeaderSectionSide;
  };
  export const EuiHeaderSection: React.SFC<EuiHeaderSectionProps>;

  type EuiHeaderBreadcrumbsProps = EuiBreadcrumbsProps;
  export const EuiHeaderBreadcrumbs: React.SFC<EuiHeaderBreadcrumbsProps>;

  interface EuiOutsideClickDetectorProps {
    children: React.ReactNode;
    isDisabled?: boolean;
    onOutsideClick: React.MouseEventHandler<Element>;
  }
  export const EuiOutsideClickDetector: React.SFC<EuiOutsideClickDetectorProps>;
}
