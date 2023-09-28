/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultGuideTranslations, getSiemGuideConfig, siemGuideId } from './siem_guide_config';
import * as i18n from './translations';

describe('getSiemGuideConfig', () => {
  it('returns a GuideConfig object with default values when no arguments are passed', () => {
    const result = getSiemGuideConfig();
    expect(result).toEqual({
      title: defaultGuideTranslations.title,
      guideName: 'Security',
      telemetryId: siemGuideId,
      completedGuideRedirectLocation: {
        appID: 'securitySolutionUI',
        path: '/dashboards',
      },
      description: defaultGuideTranslations.description,
      docs: {
        text: defaultGuideTranslations.docs,
        url: 'https://www.elastic.co/guide/en/security/current/ingest-data.html',
      },
      steps: [
        {
          id: 'add_data',
          title: defaultGuideTranslations.steps.add_data.title,
          description: {
            descriptionText: defaultGuideTranslations.steps.add_data.description,
            linkUrl: 'https://docs.elastic.co/en/integrations/endpoint',
            isLinkExternal: true,
            linkText: i18n.LINK_TEXT,
          },
          integration: 'endpoint',
          location: {
            appID: 'integrations',
            path: '/detail/endpoint/overview',
          },
        },
        {
          id: 'rules',
          title: defaultGuideTranslations.steps.rules.title,
          description: defaultGuideTranslations.steps.rules.description,
          location: {
            appID: 'securitySolutionUI',
            path: '/rules',
          },
          manualCompletion: defaultGuideTranslations.steps.rules.manualCompletion,
        },
        {
          id: 'alertsCases',
          title: defaultGuideTranslations.steps.alertsCases.title,
          description: defaultGuideTranslations.steps.alertsCases.description,
          location: {
            appID: 'securitySolutionUI',
            path: '/alerts',
          },
          manualCompletion: defaultGuideTranslations.steps.alertsCases.manualCompletion,
        },
      ],
    });
  });

  it('returns a GuideConfig object with values from the launchDarkly argument when it is passed', () => {
    const launchDarkly = {
      title: 'Custom Title',
      description: 'Custom Description',
      docs: 'Custom Docs',
      steps: {
        add_data: {
          title: 'Custom Add Data Title',
          description: 'Custom Add Data Description',
        },
        rules: {
          title: 'Custom Rules Title',
          description: 'Custom Rules Description',
          manualCompletion: {
            title: 'Custom Rules Manual Title',
            description: 'Custom Rules Manual Description',
          },
        },
        alertsCases: {
          title: 'Custom Alerts Cases Title',
          description: 'Custom Alerts Cases Description',
          manualCompletion: {
            title: 'Custom Alerts Cases Manual Title',
            description: 'Custom Alerts Cases Manual Description',
          },
        },
      },
    };
    const result = getSiemGuideConfig(launchDarkly);
    expect(result).toEqual({
      title: launchDarkly.title,
      guideName: 'Security',
      telemetryId: siemGuideId,
      completedGuideRedirectLocation: {
        appID: 'securitySolutionUI',
        path: '/dashboards',
      },
      description: launchDarkly.description,
      docs: {
        text: launchDarkly.docs,
        url: 'https://www.elastic.co/guide/en/security/current/ingest-data.html',
      },
      steps: [
        {
          id: 'add_data',
          title: launchDarkly.steps.add_data.title,
          description: {
            descriptionText: launchDarkly.steps.add_data.description,
            linkUrl: 'https://docs.elastic.co/en/integrations/endpoint',
            isLinkExternal: true,
            linkText: i18n.LINK_TEXT,
          },
          integration: 'endpoint',
          location: {
            appID: 'integrations',
            path: '/detail/endpoint/overview',
          },
        },
        {
          id: 'rules',
          title: launchDarkly.steps.rules.title,
          description: launchDarkly.steps.rules.description,
          manualCompletion: {
            title: launchDarkly.steps.rules.manualCompletion.title,
            description: launchDarkly.steps.rules.manualCompletion.description,
          },
          location: {
            appID: 'securitySolutionUI',
            path: '/rules',
          },
        },
        {
          id: 'alertsCases',
          title: launchDarkly.steps.alertsCases.title,
          description: launchDarkly.steps.alertsCases.description,
          manualCompletion: {
            title: launchDarkly.steps.alertsCases.manualCompletion.title,
            description: launchDarkly.steps.alertsCases.manualCompletion.description,
          },
          location: {
            appID: 'securitySolutionUI',
            path: '/alerts',
          },
        },
      ],
    });
  });

  it('returns a GuideConfig object with values from the launchDarkly argument and default values when some properties are missing', () => {
    const launchDarkly = {
      steps: {
        add_data: {
          title: 'Custom Add Data Title',
        },
        rules: {
          description: 'Custom Rules Description',
        },
        alertsCases: {
          manualCompletion: {
            title: 'Custom Alerts Cases Manual Title',
          },
        },
      },
    };
    // Ignore because intentionally passing an incomplete object to test that we handle missing properties
    // since there is no validation on the object from LaunchDarkly
    // @ts-ignore
    const result = getSiemGuideConfig(launchDarkly);
    expect(result).toEqual({
      title: defaultGuideTranslations.title,
      guideName: 'Security',
      telemetryId: siemGuideId,
      completedGuideRedirectLocation: {
        appID: 'securitySolutionUI',
        path: '/dashboards',
      },
      description: defaultGuideTranslations.description,
      docs: {
        text: defaultGuideTranslations.docs,
        url: 'https://www.elastic.co/guide/en/security/current/ingest-data.html',
      },
      steps: [
        {
          id: 'add_data',
          title: launchDarkly.steps.add_data.title,
          description: {
            descriptionText: defaultGuideTranslations.steps.add_data.description,
            linkUrl: 'https://docs.elastic.co/en/integrations/endpoint',
            isLinkExternal: true,
            linkText: i18n.LINK_TEXT,
          },
          integration: 'endpoint',
          location: {
            appID: 'integrations',
            path: '/detail/endpoint/overview',
          },
        },
        {
          id: 'rules',
          title: defaultGuideTranslations.steps.rules.title,
          description: launchDarkly.steps.rules.description,
          location: {
            appID: 'securitySolutionUI',
            path: '/rules',
          },
          manualCompletion: defaultGuideTranslations.steps.rules.manualCompletion,
        },
        {
          id: 'alertsCases',
          title: defaultGuideTranslations.steps.alertsCases.title,
          description: defaultGuideTranslations.steps.alertsCases.description,
          manualCompletion: {
            title: launchDarkly.steps.alertsCases.manualCompletion.title,
            description: defaultGuideTranslations.steps.alertsCases.manualCompletion.description,
          },
          location: {
            appID: 'securitySolutionUI',
            path: '/alerts',
          },
        },
      ],
    });
  });
});
