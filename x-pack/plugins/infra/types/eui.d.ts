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
import { ReactDatePickerProps } from 'react-datepicker';

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
    onOutsideClick: React.MouseEventHandler;
  }
  export const EuiOutsideClickDetector: React.SFC<EuiOutsideClickDetectorProps>;
}
