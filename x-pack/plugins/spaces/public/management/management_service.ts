/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { ManagementStart } from 'src/plugins/management/public';

interface StartDeps {
  managementStart: ManagementStart;
}

const MANAGE_SPACES_KEY = 'spaces';

export class ManagementService {
  private kibanaSection!: any;

  public start({ managementStart }: StartDeps) {
    this.kibanaSection = managementStart.legacy.getSection('kibana');
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
  }

  public stop() {
    if (this.kibanaSection && this.kibanaSection.hasItem(MANAGE_SPACES_KEY)) {
      this.kibanaSection.deregister(MANAGE_SPACES_KEY);
    }
  }
}
