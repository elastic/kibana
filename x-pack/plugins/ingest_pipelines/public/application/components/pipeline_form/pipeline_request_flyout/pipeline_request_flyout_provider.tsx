/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, FunctionComponent } from 'react';

import { Pipeline } from '../../../../../common/types';
import { useFormContext, GlobalFlyout } from '../../../../shared_imports';

import { ReadProcessorsFunction } from '../types';

import {
  PipelineRequestFlyout,
  Props as PipelineRequestProps,
  defaultFlyoutProps,
} from './pipeline_request_flyout';

interface Props {
  closeFlyout: () => void;
  readProcessors: ReadProcessorsFunction;
  isFlyoutOpen: boolean;
}

const { useGlobalFlyout } = GlobalFlyout;

export const PipelineRequestFlyoutProvider: FunctionComponent<Props> = ({
  closeFlyout,
  readProcessors,
  isFlyoutOpen,
}) => {
  const {
    addContent: addContentToGlobalFlyout,
    removeContent: removeContentFromGlobalFlyout,
  } = useGlobalFlyout();

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

  useEffect(() => {
    if (isFlyoutOpen) {
      // Open the ES request flyout
      addContentToGlobalFlyout<PipelineRequestProps>({
        id: 'pipelineRequest',
        Component: PipelineRequestFlyout,
        flyoutProps: {
          ...defaultFlyoutProps,
          onClose: closeFlyout,
        },
        props: {
          pipeline: { ...formData, ...readProcessors() },
          closeFlyout,
        },
      });
    }
  }, [isFlyoutOpen, addContentToGlobalFlyout, closeFlyout, formData, readProcessors]);

  useEffect(() => {
    if (!isFlyoutOpen) {
      removeContentFromGlobalFlyout('pipelineRequest');
    }
  }, [isFlyoutOpen, removeContentFromGlobalFlyout]);

  return null;
};
