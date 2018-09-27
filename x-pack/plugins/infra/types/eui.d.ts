/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 *  /!\  These type definitions are temporary until the upstream @elastic/eui
 *       package includes them.
 */

import { CommonProps, EuiToolTipPosition } from '@elastic/eui';
import { Moment } from 'moment';
import { MouseEventHandler, ReactType, Ref } from 'react';
import { ReactDatePickerProps } from 'react-datepicker';
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
  };
  export const EuiHeaderSection: React.SFC<EuiHeaderSectionProps>;

  type EuiHeaderBreadcrumbsProps = EuiBreadcrumbsProps;
  export const EuiHeaderBreadcrumbs: React.SFC<EuiHeaderBreadcrumbsProps>;

  type EuiDatePickerProps = CommonProps &
    Pick<
      ReactDatePickerProps,
      Exclude<
        keyof ReactDatePickerProps,
        | 'monthsShown'
        | 'showWeekNumbers'
        | 'fixedHeight'
        | 'dropdownMode'
        | 'useShortMonthInDropdown'
        | 'todayButton'
        | 'timeCaption'
        | 'disabledKeyboardNavigation'
        | 'isClearable'
        | 'withPortal'
        | 'ref'
        | 'placeholderText'
      >
    > & {
      fullWidth?: boolean;
      inputRef?: Ref<Element | ReactType>;
      injectTimes?: Moment[];
      isInvalid?: boolean;
      isLoading?: boolean;
      placeholder?: string;
      shadow?: boolean;
    };
  export const EuiDatePicker: React.SFC<EuiDatePickerProps>;

  type EuiFilterGroupProps = CommonProps;
  export const EuiFilterGroup: React.SFC<EuiFilterGroupProps>;

  type EuiFilterButtonProps = CommonProps & {
    color?: ButtonColor;
    href?: string;
    iconSide?: ButtonIconSide;
    iconType?: IconType;
    isDisabled?: boolean;
    isSelected?: boolean;
    onClick: MouseEventHandler<HTMLElement>;
    rel?: string;
    target?: string;
    type?: string;
  };
  export const EuiFilterButton: React.SFC<EuiFilterButtonProps>;

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

  export const EuiErrorBoundary: React.SFC<EuiErrorBoundaryProps>;

  type EuiComboBoxProps = CommonProps & {
    placeholder?: string;
    options?: any[];
    selectedOptions?: any[];
    onChange?: (arg: any) => void;
    fullWidth?: boolean;
    isClearable?: boolean;
    singleSelection?: boolean;
  };
  export const EuiComboBox: React.SFC<EuiComboBoxProps>;

  type EuiSelectProps = CommonProps & {
    options?: any[];
    value: any;
    onChange?: (arg: any) => void;
  };
  export const EuiSelect: React.SFC<EuiSelectProps>;

  type EuiSizesResponsive = 'xs' | 's' | 'm' | 'l' | 'xl';
  type EuiResponsiveProps = CommonProps & {
    children: React.ReactNode;
    sizes: EuiSizesResponsive[];
  };

  export const EuiHideFor: React.SFC<EuiResponsiveProps>;

  export const EuiShowFor: React.SFC<EuiResponsiveProps>;
}
