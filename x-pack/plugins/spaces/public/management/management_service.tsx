/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ManagementStart } from 'src/plugins/management/public';
import { CoreStart } from 'src/core/public';
import { SecurityPluginStart } from '../../../security/public';
import { SpacesGridPage } from './spaces_grid';
import { SpacesManager } from '../spaces_manager';
import { ManageSpacePage } from './edit_space';
import { Space } from '../../common/model/space';

interface StartDeps {
  coreStart: Pick<CoreStart, 'application' | 'http' | 'notifications' | 'i18n'>;
  managementStart?: ManagementStart;
  securityLicense?: SecurityPluginStart['securityLicense'];
  spacesManager: SpacesManager;
}

const MANAGE_SPACES_KEY = 'spaces';

export class ManagementService {
  private kibanaSection!: any;

  public start({ coreStart, managementStart, securityLicense, spacesManager }: StartDeps) {
    this.kibanaSection = managementStart?.legacy.getSection('kibana');
    if (this.kibanaSection && !this.kibanaSection.hasItem(MANAGE_SPACES_KEY)) {
      this.kibanaSection.register(MANAGE_SPACES_KEY, {
        name: 'spacesManagementLink',
        order: 10,
        display: i18n.translate('xpack.spaces.displayName', {
          defaultMessage: 'Spaces',
        }),
        url: `#/management/spaces/list`,
      });
    }

    return {
      __legacyCompat: {
        urls: {},
        SpacesGridPage: () => (
          <coreStart.i18n.Context>
            <SpacesGridPage
              capabilities={coreStart.application.capabilities}
              http={coreStart.http}
              notifications={coreStart.notifications}
              spacesManager={spacesManager}
              securityEnabled={Boolean(securityLicense && securityLicense.getFeatures().showLinks)}
            />
          </coreStart.i18n.Context>
        ),
        ManageSpacePage: ({
          spaceId,
          onLoadSpace,
        }: {
          spaceId?: string;
          onLoadSpace?: (space: Space) => void;
        }) => (
          <coreStart.i18n.Context>
            <ManageSpacePage
              capabilities={coreStart.application.capabilities}
              http={coreStart.http}
              notifications={coreStart.notifications}
              spacesManager={spacesManager}
              spaceId={spaceId}
              onLoadSpace={onLoadSpace}
              securityEnabled={Boolean(securityLicense && securityLicense.getFeatures().showLinks)}
            />
          </coreStart.i18n.Context>
        ),
      },
    };
  }

  public stop() {
    if (this.kibanaSection && this.kibanaSection.hasItem(MANAGE_SPACES_KEY)) {
      this.kibanaSection.deregister(MANAGE_SPACES_KEY);
    }
  }
}
