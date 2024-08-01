/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'query-string';
import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { dynamic } from '@kbn/shared-ux-utility';
import { basicResolvers } from '../../resolvers';
import { ML_PAGES } from '../../../../locator';
import type { NavigateToPath } from '../../../contexts/kibana';
import { useMlApiContext, useMlKibana, useNavigateToPath } from '../../../contexts/kibana';
import type { MlRoute, PageProps } from '../../router';
import { createPath, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { mlJobServiceFactory } from '../../../services/job_service';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { useCreateADLinks } from '../../../components/custom_hooks/use_create_ad_links';
import { DataSourceContextProvider } from '../../../contexts/ml';
import { useToastNotificationService } from '../../../services/toast_notification_service';

const Page = dynamic(async () => ({
  default: (await import('../../../jobs/new_job/recognize')).Page,
}));

export const recognizeRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_RECOGNIZER),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('CREATE_JOB_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.jobsBreadcrumbs.selectIndexOrSearchLabelRecognize', {
        defaultMessage: 'Recognized index',
      }),
      href: '',
    },
  ],
});

export const checkViewOrCreateRouteFactory = (): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_MODULES_VIEW_OR_CREATE),
  render: (props, deps) => <CheckViewOrCreateWrapper {...props} deps={deps} />,
  // no breadcrumbs since it's just a redirect
  breadcrumbs: [],
});

const PageWrapper: FC<PageProps> = ({ location }) => {
  const { id } = parse(location.search, { sort: false });
  const mlApiServices = useMlApiContext();
  const toastNotificationService = useToastNotificationService();

  const { context, results } = useRouteResolver('full', ['canGetJobs'], {
    ...basicResolvers(),
    existingJobsAndGroups: () =>
      mlJobServiceFactory(toastNotificationService, mlApiServices).getJobAndGroupIds(),
  });

  return (
    <PageLoader context={context}>
      <DataSourceContextProvider>
        {results ? (
          <Page moduleId={id as string} existingGroupIds={results.existingJobsAndGroups.groupIds} />
        ) : null}
      </DataSourceContextProvider>
    </PageLoader>
  );
};

const CheckViewOrCreateWrapper: FC<PageProps> = ({ location }) => {
  const {
    services: {
      notifications: { toasts },
      mlServices: { mlApiServices },
    },
  } = useMlKibana();

  const { id: moduleId, index: dataViewId }: Record<string, any> = parse(location.search, {
    sort: false,
  });

  const { createLinkWithUserDefaults } = useCreateADLinks();

  const navigateToPath = useNavigateToPath();

  /**
   * Checks whether the jobs in a data recognizer module have been created.
   * Redirects to the Anomaly Explorer to view the jobs if they have been created,
   * or the recognizer job wizard for the module if not.
   */
  function checkViewOrCreateJobs(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      // Load the module, and check if the job(s) in the module have been created.
      // If so, load the jobs in the Anomaly Explorer.
      // Otherwise open the data recognizer wizard for the module.
      // Always want to call reject() so as not to load original page.
      mlApiServices
        .dataRecognizerModuleJobsExist({ moduleId })
        .then(async (resp: any) => {
          if (resp.jobsExist === true) {
            // also honor user's time filter setting in Advanced Settings
            const url = createLinkWithUserDefaults('explorer', resp.jobs);
            await navigateToPath(url);
            reject();
          } else {
            await navigateToPath(`/jobs/new_job/recognize?id=${moduleId}&index=${dataViewId}`);
            reject();
          }
        })
        .catch(async (err: Error) => {
          toasts.addError(err, {
            title: i18n.translate('xpack.ml.newJob.recognize.moduleCheckJobsExistWarningTitle', {
              defaultMessage: 'Error checking module {moduleId}',
              values: { moduleId },
            }),
            toastMessage: i18n.translate(
              'xpack.ml.newJob.recognize.moduleCheckJobsExistWarningDescription',
              {
                defaultMessage:
                  'An error occurred checking whether the jobs in the module have been created. Search the list for matching jobs or create new jobs.',
              }
            ),
          });
          await navigateToPath(`/jobs`);
          reject();
        });
    });
  }

  useRouteResolver('full', ['canCreateJob'], { checkViewOrCreateJobs });

  return null;
};
