/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { SLOApplyTo } from './slo_apply_to';
import { Annotation } from '../../../../common/annotations';

export function AnnotationApplyTo({ editAnnotation }: { editAnnotation?: Annotation | null }) {
  return (
    <>
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('xpack.observability.annotationForm.euiFormRow.applyTo', {
            defaultMessage: 'Apply to',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <SLOApplyTo editAnnotation={editAnnotation} />
    </>
  );
}
