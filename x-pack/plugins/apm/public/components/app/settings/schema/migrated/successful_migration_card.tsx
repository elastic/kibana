/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCard, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { CardFooterContent } from './card_footer_content';

export function SuccessfulMigrationCard() {
  return (
    <EuiCard
      icon={<EuiIcon size="xxl" type="checkInCircleFilled" color="success" />}
      title={i18n.translate('xpack.apm.settings.schema.success.title', {
        defaultMessage: 'Elastic Agent successfully setup!',
      })}
      description={i18n.translate(
        'xpack.apm.settings.schema.success.description',
        {
          defaultMessage:
            'Your APM integration is now setup and ready to receive data from your currently instrumented agents. Feel free to review the policies applied to your integtration.',
        }
      )}
      footer={<CardFooterContent />}
    />
  );
}
