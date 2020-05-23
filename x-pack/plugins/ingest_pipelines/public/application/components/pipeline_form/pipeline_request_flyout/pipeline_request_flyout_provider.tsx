/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';

import { Pipeline } from '../../../../../common/types';
import { useFormContext } from '../../../../shared_imports';
import { PipelineRequestFlyout } from './pipeline_request_flyout';

export const PipelineRequestFlyoutProvider = ({ closeFlyout }: { closeFlyout: () => void }) => {
  const form = useFormContext();
  const [formData, setFormData] = useState<Pipeline>({} as Pipeline);

  useEffect(() => {
    const subscription = form.subscribe(async ({ isValid, validate, data }) => {
      const isFormValid = isValid ?? (await validate());
      if (isFormValid) {
        setFormData(data.format() as Pipeline);
      }
    });

    return subscription.unsubscribe;
  }, [form]);

  return <PipelineRequestFlyout pipeline={formData} closeFlyout={closeFlyout} />;
};
