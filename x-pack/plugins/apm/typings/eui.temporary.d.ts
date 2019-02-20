/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CommonProps } from '@elastic/eui';

declare module '@elastic/eui' {
  // vvv TODO this can be removed when EUI PR lands: https://github.com/elastic/eui/pull/1574 vvv
  interface OnTimeChangeProps {
    start: string;
    end: string;
    isInvalid: boolean;
    isQuickSelection: boolean;
  }

  interface OnRefreshChangeProps {
    isPaused: boolean;
    refreshInterval: number;
  }

  export type EuiSuperDatePickerProps = CommonProps & {
    start?: string;
    end?: string;
    isPaused?: boolean;
    refreshInterval?: number;
    onTimeChange: (props: OnTimeChangeProps) => void;
    onRefreshChange?: (props: OnRefreshChangeProps) => void;
    showUpdateButton?: boolean;
  };
  export const EuiSuperDatePicker: React.SFC<EuiSuperDatePickerProps>;
  // ^^^ TODO this can be removed when EUI PR lands: https://github.com/elastic/eui/pull/1574 ^^^
}
