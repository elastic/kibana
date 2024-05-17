/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import * as t from 'io-ts';
import React from 'react';
import {
  IndexLifecyclePhaseSelectOption,
  indexLifecyclePhaseRt,
} from '../../../../common/storage_explorer_types';
import { Breadcrumb } from '../../app/breadcrumb';
import { StorageExplorer } from '../../app/storage_explorer';
import { getStorageExplorerFeedbackHref } from '../../app/storage_explorer/get_storage_explorer_links';
import { ApmMainTemplate } from '../templates/apm_main_template';

export const storageExplorer = {
  '/storage-explorer': {
    element: (
      <Breadcrumb
        title={i18n.translate('xpack.apm.views.storageExplorer.title', {
          defaultMessage: 'Storage Explorer',
        })}
        href="/storage-explorer"
      >
        <ApmMainTemplate
          environmentFilter={false}
          pageHeader={{
            alignItems: 'center',
            pageTitle: i18n.translate('xpack.apm.views.storageExplorer.title', {
              defaultMessage: 'Storage Explorer',
            }),
            rightSideItems: [
              <EuiLink
                data-test-subj="apmGiveFeedbackLink"
                href={getStorageExplorerFeedbackHref()}
                target="_blank"
              >
                {i18n.translate('xpack.apm.views.storageExplorer.giveFeedback', {
                  defaultMessage: 'Give feedback',
                })}
              </EuiLink>,
            ],
          }}
        >
          <StorageExplorer />
        </ApmMainTemplate>
      </Breadcrumb>
    ),
    params: t.type({
      query: indexLifecyclePhaseRt,
    }),
    defaults: {
      query: {
        indexLifecyclePhase: IndexLifecyclePhaseSelectOption.All,
      },
    },
  },
};
