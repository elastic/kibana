/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  UseFormReturn,
  ControllerRenderProps,
  ControllerFieldState,
  FormState,
} from 'react-hook-form';
import {
  ServiceLocations,
  FormMonitorType,
  SyntheticsMonitor,
} from '../../../../../common/runtime_types/monitor_management';

export type StepKey = 'step1' | 'step2' | 'step3' | 'scriptEdit';

export interface Step {
  title: string;
  children: React.ReactNode;
}

export type StepMap = Record<FormMonitorType, Step[]>;

export * from '../../../../../common/runtime_types/monitor_management';
export * from '../../../../../common/types/monitor_validation';

export interface FieldMeta {
  fieldKey: string;
  component: React.ComponentType<any>;
  label?: string;
  ariaLabel?: string;
  helpText?: string | React.ReactNode;
  props?: (params: {
    field?: ControllerRenderProps;
    formState: FormState<SyntheticsMonitor>;
    setValue: UseFormReturn['setValue'];
    reset: UseFormReturn['reset'];
    locations: ServiceLocations;
    dependencies: unknown[];
    dependenciesFieldMeta: Record<string, ControllerFieldState>;
    space?: string;
    isEdit?: boolean;
  }) => Record<string, any>;
  controlled?: boolean;
  required?: boolean;
  shouldUseSetValue?: boolean;
  customHook?: (value: unknown) => {
    // custom hooks are only supported for controlled components and only supported for determining error validation
    func: Function;
    params: unknown;
    fieldKey: string;
    error: string;
  };
  onChange?: (
    event: React.ChangeEvent<HTMLInputElement>,
    formOnChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  ) => void;
  showWhen?: [string, any]; // show field when another field equals an arbitrary value
  validation?: (dependencies: unknown[]) => Parameters<UseFormReturn['register']>[1];
  error?: React.ReactNode;
  dependencies?: string[]; // fields that another field may depend for or validation. Values are passed to the validation function
}
