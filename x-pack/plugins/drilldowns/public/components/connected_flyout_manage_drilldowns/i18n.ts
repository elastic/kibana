/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const toastDrilldownCreated = {
  title: i18n.translate(
    'xpack.drilldowns.components.flyoutDrilldownWizard.toast.drilldownCreatedTitle',
    {
      defaultMessage: 'Drilldown created',
    }
  ),
  text: (drilldownName: string) =>
    i18n.translate('xpack.drilldowns.components.flyoutDrilldownWizard.toast.drilldownCreatedText', {
      defaultMessage: 'You created "{drilldownName}"',
      values: {
        drilldownName,
      },
    }),
};

export const toastDrilldownEdited = {
  title: i18n.translate(
    'xpack.drilldowns.components.flyoutDrilldownWizard.toast.drilldownEditedTitle',
    {
      defaultMessage: 'Drilldown edited',
    }
  ),
  text: (drilldownName: string) =>
    i18n.translate('xpack.drilldowns.components.flyoutDrilldownWizard.toast.drilldownEditedText', {
      defaultMessage: 'You edited "{drilldownName}"',
      values: {
        drilldownName,
      },
    }),
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
      defaultMessage: 'You deleted a drilldown',
    }
  ),
};

export const toastDrilldownsDeleted = {
  title: i18n.translate(
    'xpack.drilldowns.components.flyoutDrilldownWizard.toast.drilldownsDeletedTitle',
    {
      defaultMessage: 'Drilldowns deleted',
    }
  ),
  text: (n: number) =>
    i18n.translate(
      'xpack.drilldowns.components.flyoutDrilldownWizard.toast.drilldownsDeletedText',
      {
        defaultMessage: 'You deleted {n} drilldowns',
        values: {
          n,
        },
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

export const toastDrilldownsFetchError = i18n.translate(
  'xpack.drilldowns.components.flyoutDrilldownWizard.toast.drilldownsFetchErrorTitle',
  {
    defaultMessage: 'Error fetching drilldowns',
  }
);
