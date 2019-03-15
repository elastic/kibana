/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 *  /!\  These type definitions are temporary until the upstream @elastic/eui
 *       package includes them.
 */

declare module '@elastic/eui' {
  export const EuiWrappingPopover: React.SFC<any>;
}

import { IconType, ToolTipPositions } from '@elastic/eui';
import { CommonProps } from '@elastic/eui/src/components/common';
import moment from 'moment';
import { MouseEventHandler, ReactType, Ref } from 'react';
import { JsonObject } from '../common/typed_json';

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
    grow?: boolean;
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

  interface EuiFormControlLayoutIconProps {
    type: IconType;
    side?: 'left' | 'right';
    onClick?: React.MouseEventHandler<Element>;
  }

  interface EuiFormControlLayoutClearIconProps {
    onClick?: React.MouseEventHandler<Element>;
  }

  type EuiFormControlLayoutProps = CommonProps & {
    icon?: string | EuiFormControlLayoutIconProps;
    clear?: EuiFormControlLayoutClearIconProps;
    fullWidth?: boolean;
    isLoading?: boolean;
    compressed?: boolean;
    prepend?: React.ReactNode;
    append?: React.ReactNode;
  };
  export const EuiFormControlLayout: React.SFC<EuiFormControlLayoutProps>;

  type EuiSideNavProps = CommonProps & {
    style?: any;
    items: Array<{
      id: string | number;
      name: string;
      items: Array<{
        id: string;
        name: string;
        onClick: () => void;
      }>;
    }>;
    mobileTitle?: React.ReactNode;
    toggleOpenOnMobile?: () => void;
    isOpenOnMobile?: boolean;
  };
  export const EuiSideNav: React.SFC<EuiSideNavProps>;

  type EuiErrorBoundaryProps = CommonProps & {
    children: React.ReactNode;
  };

  type EuiSizesResponsive = 'xs' | 's' | 'm' | 'l' | 'xl';
  type EuiResponsiveProps = CommonProps & {
    children: React.ReactNode;
    sizes: EuiSizesResponsive[];
  };

  export const EuiHideFor: React.SFC<EuiResponsiveProps>;

  export const EuiShowFor: React.SFC<EuiResponsiveProps>;

  type EuiInMemoryTableProps = CommonProps & {
    items?: any;
    columns?: any;
    sorting?: any;
    search?: any;
    selection?: any;
    pagination?: any;
    itemId?: any;
    isSelectable?: any;
    loading?: any;
    hasActions?: any;
    message?: any;
    rowProps?: any;
    cellProps?: any;
  };
  export const EuiInMemoryTable: React.SFC<EuiInMemoryTableProps>;
}
