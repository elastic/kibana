/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { useFormData } from '../../../../../shared_imports';
import { FormInternal, DataTierAllocationType, DataAllocationMetaFields } from '../../types';

import './_timeline.scss';

interface TimelineInputs {
  warm?: {
    minAge: string;
    dataTierAllocationType: DataTierAllocationType;
  };
  cold?: {
    minAge: string;
    dataTierAllocationType: DataTierAllocationType;
  };
  delete?: {
    minAge: string;
  };
}

const getMinAge = (phase: { min_age: string }) => phase.min_age;

const getDataTierAllocation = (phaseMeta: DataAllocationMetaFields) =>
  phaseMeta.dataTierAllocationType;

const formDataToTimelineInputs = (formData: FormInternal): TimelineInputs => {
  const {
    _meta,
    phases: { warm, cold, delete: deletePhase },
  } = formData;

  return {
    warm: warm ? {} : {},
    delete: deletePhase ? getMinAge(deletePhase) : {},
  };
};

export const Timeline: FunctionComponent = () => {
  const [formData] = useFormData<FormInternal>();
  return (
    <div>
      <EuiFlexGroup direction="row">
        <EuiFlexItem className="ilmTimeline__hotPhase" />
        <EuiFlexItem className="ilmTimeline__warmPhase" />
        <EuiFlexItem className="ilmTimeline__coldPhase" />
      </EuiFlexGroup>
    </div>
  );
};
