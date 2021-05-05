/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPageHeaderProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { merge } from '@kbn/std';

export const withDefaultHeaderProps = (headerProps: EuiPageHeaderProps): EuiPageHeaderProps =>
  merge<EuiPageHeaderProps, EuiPageHeaderProps>(
    {
      iconType: 'logoObservability',
      pageTitle,
    },
    headerProps
  );

const pageTitle = i18n.translate('xpack.observability.home.title', {
  defaultMessage: 'Observability',
});
