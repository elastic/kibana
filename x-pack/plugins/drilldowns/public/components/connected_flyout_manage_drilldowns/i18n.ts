/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const toastDrilldownCreated = {
  title: (drilldownName: string) =>
    i18n.translate(
      'xpack.drilldowns.components.flyoutDrilldownWizard.toast.drilldownCreatedTitle',
      {
        defaultMessage: 'Drilldown "{drilldownName}" created',
        values: {
          drilldownName,
        },
      }
    ),
  text: i18n.translate(
    'xpack.drilldowns.components.flyoutDrilldownWizard.toast.drilldownCreatedText',
    {
      // TODO: remove `Save your dashboard before testing.` part
      // when drilldowns are used not only in dashboard
      // or after https://github.com/elastic/kibana/issues/65179 implemented
      defaultMessage: 'Save your dashboard before testing.',
    }
  ),
};

export const toastDrilldownEdited = {
  title: (drilldownName: string) =>
    i18n.translate('xpack.drilldowns.components.flyoutDrilldownWizard.toast.drilldownEditedTitle', {
      defaultMessage: 'Drilldown "{drilldownName}" updated',
      values: {
        drilldownName,
      },
    }),
  text: i18n.translate(
    'xpack.drilldowns.components.flyoutDrilldownWizard.toast.drilldownEditedText',
    {
      defaultMessage: 'Save your dashboard before testing.',
    }
  ),
};

export const toastDrilldownDeleted = {
  title: i18n.translate(
    'xpack.drilldowns.components.flyoutDrilldownWizard.toast.drilldownDeletedTitle',
    {
      defaultMessage: 'Drilldown deleted',
    }
  ),
  text: i18n.translate(
    'xpack.drilldowns.components.flyoutDrilldownWizard.toast.drilldownDeletedText',
    {
      defaultMessage: 'Save your dashboard before testing.',
    }
  ),
};

export const toastDrilldownsDeleted = {
  title: (n: number) =>
    i18n.translate(
      'xpack.drilldowns.components.flyoutDrilldownWizard.toast.drilldownsDeletedTitle',
      {
        defaultMessage: '{n} drilldowns deleted',
        values: { n },
      }
    ),
  text: i18n.translate(
    'xpack.drilldowns.components.flyoutDrilldownWizard.toast.drilldownsDeletedText',
    {
      defaultMessage: 'Save your dashboard before testing.',
    }
  ),
};

export const toastDrilldownsCRUDError = i18n.translate(
  'xpack.drilldowns.components.flyoutDrilldownWizard.toast.drilldownsCRUDErrorTitle',
  {
    defaultMessage: 'Error saving drilldown',
    description: 'Title for generic error toast when persisting drilldown updates failed',
  }
);
