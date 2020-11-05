/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { SavedObjectUnsanitizedDoc, SavedObjectSanitizedDoc } from '../../../../../src/core/server';
import { ConnectorTypes, CommentType } from '../../common/api';

interface UnsanitizedCase {
  connector_id: string;
}

interface UnsanitizedConfigure {
  connector_id: string;
  connector_name: string;
}

interface SanitizedCase {
  connector: {
    id: string;
    name: string | null;
    type: string | null;
    fields: null;
  };
}

interface SanitizedConfigure {
  connector: {
    id: string;
    name: string | null;
    type: string | null;
    fields: null;
  };
}

interface UserActions {
  action_field: string[];
  new_value: string;
  old_value: string;
}

export const caseMigrations = {
  '7.10.0': (
    doc: SavedObjectUnsanitizedDoc<UnsanitizedCase>
  ): SavedObjectSanitizedDoc<SanitizedCase> => {
    const { connector_id, ...attributesWithoutConnectorId } = doc.attributes;

    return {
      ...doc,
      attributes: {
        ...attributesWithoutConnectorId,
        connector: {
          id: connector_id ?? 'none',
          name: 'none',
          type: ConnectorTypes.none,
          fields: null,
        },
      },
      references: doc.references || [],
    };
  },
};

export const configureMigrations = {
  '7.10.0': (
    doc: SavedObjectUnsanitizedDoc<UnsanitizedConfigure>
  ): SavedObjectSanitizedDoc<SanitizedConfigure> => {
    const { connector_id, connector_name, ...restAttributes } = doc.attributes;

    return {
      ...doc,
      attributes: {
        ...restAttributes,
        connector: {
          id: connector_id ?? 'none',
          name: connector_name ?? 'none',
          type: ConnectorTypes.none,
          fields: null,
        },
      },
      references: doc.references || [],
    };
  },
};

export const userActionsMigrations = {
  '7.10.0': (doc: SavedObjectUnsanitizedDoc<UserActions>): SavedObjectSanitizedDoc<UserActions> => {
    const { action_field, new_value, old_value, ...restAttributes } = doc.attributes;

    if (
      action_field == null ||
      !Array.isArray(action_field) ||
      action_field[0] !== 'connector_id'
    ) {
      return { ...doc, references: doc.references || [] };
    }

    return {
      ...doc,
      attributes: {
        ...restAttributes,
        action_field: ['connector'],
        new_value:
          new_value != null
            ? JSON.stringify({
                id: new_value,
                name: 'none',
                type: ConnectorTypes.none,
                fields: null,
              })
            : new_value,
        old_value:
          old_value != null
            ? JSON.stringify({
                id: old_value,
                name: 'none',
                type: ConnectorTypes.none,
                fields: null,
              })
            : old_value,
      },
      references: doc.references || [],
    };
  },
};

interface UnsanitizedComment {
  comment: string;
}

interface SanitizedComment {
  comment: string;
  context: {
    type: CommentType;
    savedObjectId: string | null;
  };
}

export const commentsMigrations = {
  '7.11.0': (
    doc: SavedObjectUnsanitizedDoc<UnsanitizedComment>
  ): SavedObjectSanitizedDoc<SanitizedComment> => {
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        context: {
          type: CommentType.user,
          savedObjectId: null,
        },
      },
      references: doc.references || [],
    };
  },
};
