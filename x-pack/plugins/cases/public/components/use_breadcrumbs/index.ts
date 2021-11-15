/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb } from 'kibana/public';
import { useCallback, useEffect } from 'react';
import { useKibana, useNavigation } from '../../common/lib/kibana';
import { CasesDeepLinkId, ICasesDeepLinkId } from '../../common/navigation';
import { useCasesContext } from '../cases_context/use_cases_context';

const casesBreadcrumbTitle: Record<ICasesDeepLinkId, string> = {
  [CasesDeepLinkId.cases]: i18n.translate('xpack.cases.breadcrumbs.all_cases', {
    defaultMessage: 'Cases',
  }),
  [CasesDeepLinkId.casesCreate]: i18n.translate('xpack.cases.breadcrumbs.create_case', {
    defaultMessage: 'Create',
  }),
  [CasesDeepLinkId.casesConfigure]: i18n.translate('xpack.cases.breadcrumbs.configure_cases', {
    defaultMessage: 'Configure',
  }),
};

function getTitleFromBreadCrumbs(breadcrumbs: ChromeBreadcrumb[]) {
  return breadcrumbs.map(({ text }) => text?.toString() ?? '').reverse();
}

const useApplyBreadcrumbs = () => {
  const {
    chrome: { docTitle, setBreadcrumbs },
    application: { navigateToUrl },
  } = useKibana().services;
  return useCallback(
    (breadcrumbs: ChromeBreadcrumb[]) => {
      docTitle.change(getTitleFromBreadCrumbs(breadcrumbs));
      setBreadcrumbs(
        breadcrumbs.map((breadcrumb) => ({
          ...breadcrumb,
          ...(breadcrumb.href && !breadcrumb.onClick
            ? {
                onClick: (event) => {
                  if (event) {
                    event.preventDefault();
                  }
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  navigateToUrl(breadcrumb.href!);
                },
              }
            : {}),
        }))
      );
    },
    [docTitle, setBreadcrumbs, navigateToUrl]
  );
};

export const useCasesBreadcrumbs = (pageDeepLink: ICasesDeepLinkId) => {
  const { rootBreadcrumbs, appId } = useCasesContext();
  const { getAppUrl } = useNavigation(appId);
  const applyBreadcrumbs = useApplyBreadcrumbs();

  useEffect(() => {
    if (rootBreadcrumbs) {
      const casesBreadcrumbs: ChromeBreadcrumb[] = [...rootBreadcrumbs];

      if (pageDeepLink === CasesDeepLinkId.cases) {
        casesBreadcrumbs.push({
          text: casesBreadcrumbTitle[CasesDeepLinkId.cases],
        });
      } else {
        casesBreadcrumbs.push(
          {
            text: casesBreadcrumbTitle[CasesDeepLinkId.cases],
            href: getAppUrl({ deepLinkId: CasesDeepLinkId.cases }),
          },
          {
            text: casesBreadcrumbTitle[pageDeepLink],
          }
        );
      }
      applyBreadcrumbs(casesBreadcrumbs);
    }
  }, [pageDeepLink, rootBreadcrumbs, getAppUrl, applyBreadcrumbs]);
};

export const useCasesTitleBreadcrumbs = (caseTitle: string) => {
  const { rootBreadcrumbs, appId } = useCasesContext();
  const { getAppUrl } = useNavigation(appId);
  const applyBreadcrumbs = useApplyBreadcrumbs();

  useEffect(() => {
    if (rootBreadcrumbs) {
      const casesBreadcrumbs: ChromeBreadcrumb[] = [
        ...rootBreadcrumbs,
        {
          text: casesBreadcrumbTitle[CasesDeepLinkId.cases],
          href: getAppUrl({ deepLinkId: CasesDeepLinkId.cases }),
        },
        {
          text: caseTitle,
        },
      ];
      applyBreadcrumbs(casesBreadcrumbs);
    }
  }, [caseTitle, rootBreadcrumbs, getAppUrl, applyBreadcrumbs]);
};
