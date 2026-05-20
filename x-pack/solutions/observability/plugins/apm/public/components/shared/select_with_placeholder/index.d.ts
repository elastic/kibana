import React from 'react';
import type { EuiSelectProps } from '@elastic/eui';
export declare const NO_SELECTION = "__NO_SELECTION__";
/**
 * This component addresses some cross-browser inconsistencies of `EuiSelect`
 * with `hasNoInitialSelection`. It uses the `placeholder` prop to populate
 * the first option as the initial, not selected option.
 */
export declare const SelectWithPlaceholder: (props: EuiSelectProps & {
    placeholder?: string;
}) => React.JSX.Element;
