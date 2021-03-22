/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb } from 'kibana/public';
import { ManagementAppMountParams } from '../../../../../../src/plugins/management/public';

type SetBreadcrumbs = ManagementAppMountParams['setBreadcrumbs'];

const breadcrumbs = {
  policies: (): ChromeBreadcrumb[] => [
    {
      text: i18n.translate('xpack.indexLifecycleMgmt.breadcrumb.homeLabel', {
        defaultMessage: 'Index Lifecycle Management',
      }),
      href: `/policies`,
    },
  ],
  createPolicy: ({ policyPath }: { policyPath?: string }) => [
    ...breadcrumbs.policies(),
    {
      text: i18n.translate('xpack.indexLifecycleMgmt.breadcrumb.createPolicyLabel', {
        defaultMessage: 'Create policy',
      }),
      href: policyPath,
    },
  ],
  editPolicy: ({ policyPath }: { policyPath?: string }) => [
    ...breadcrumbs.policies(),
    {
      text: i18n.translate('xpack.indexLifecycleMgmt.breadcrumb.editPolicyLabel', {
        defaultMessage: 'Edit policy',
      }),
      href: policyPath,
    },
  ],
  configurePolicyRollup: ({
    isNewPolicy,
    policyPath,
  }: {
    isNewPolicy: boolean;
    policyPath: string;
  }) => {
    const policyBreadcrumb = isNewPolicy
      ? breadcrumbs.createPolicy({ policyPath })
      : breadcrumbs.editPolicy({ policyPath });
    return [
      ...policyBreadcrumb,
      {
        text: i18n.translate('xpack.indexLifecycleMgmt.breadcrumb.editPolicyRollupLabel', {
          defaultMessage: 'Configure rollup',
        }),
        href: undefined,
      },
    ];
  },
};

type SetBreadcrumbsArg =
  | {
      type: 'policies';
    }
  | {
      type: 'createPolicy';
    }
  | {
      type: 'editPolicy';
    }
  | {
      type: 'configurePolicyRollup';
      payload: { isNewPolicy: boolean; policyPath: string };
    };

export class BreadcrumbService {
  private setBreadcrumbsHandler?: SetBreadcrumbs;

  public setup(setBreadcrumbsHandler: SetBreadcrumbs): void {
    this.setBreadcrumbsHandler = setBreadcrumbsHandler;
  }

  public setBreadcrumbs(arg: SetBreadcrumbsArg): void {
    if (!this.setBreadcrumbsHandler) {
      throw new Error(`BreadcrumbService#setup() must be called first!`);
    }

    let newBreadcrumbs: ChromeBreadcrumb[];
    switch (arg.type) {
      case 'policies':
        newBreadcrumbs = breadcrumbs.policies();
        break;
      case 'createPolicy':
        newBreadcrumbs = breadcrumbs.createPolicy({});
        break;
      case 'editPolicy':
        newBreadcrumbs = breadcrumbs.editPolicy({});
        break;
      case 'configurePolicyRollup':
        newBreadcrumbs = breadcrumbs.configurePolicyRollup(arg.payload);
        break;
      default:
        newBreadcrumbs = breadcrumbs.policies();
    }

    // Pop off last breadcrumb
    const lastBreadcrumb = newBreadcrumbs.pop() as {
      text: string;
      href?: string;
    };

    // Put last breadcrumb back without href
    newBreadcrumbs.push({
      ...lastBreadcrumb,
      href: undefined,
    });

    this.setBreadcrumbsHandler(newBreadcrumbs);
  }
}
