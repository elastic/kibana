/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectsType, SavedObjectsModelVersion } from '@kbn/core/server';
import { tagSavedObjectTypeName, TagAttributes } from '../../common';

//////////
// Example 1
// Migration from model version '0' to '1'
// renaming the 'name' property to 'title'
/////////

// v0 attributes model
interface Version0Attrs {
  name: string;
  description: string;
  color: string;
}

// v0-compat attributes model: adding the 'title' field
type Version0CompatAttrs = Version0Attrs & {
  title: string;
};

// v1 attributes model: removing the 'name' field
type Version1Attrs = Omit<Version0CompatAttrs, 'name'>;

const tagModelVersion1: SavedObjectsModelVersion<
  Version0Attrs,
  Version0CompatAttrs,
  Version1Attrs
> = {
  expand: {
    addedMappings: {
      title: {
        type: 'text',
      },
    },
    migration: {
      up: (doc, ctx) => {
        return {
          ...doc,
          attributes: {
            ...doc.attributes,
            // UP to compat: copy name to title
            title: doc.attributes.name,
          },
        };
      },
      down: (doc, ctx) => {
        // DOWN from compat: remove title
        const { title, ...attrs } = doc.attributes;
        return {
          ...doc,
          attrs,
        };
      },
    },
  },
  contract: {
    removedMappings: ['name'],
    migration: {
      up: (doc, ctx) => {
        // UP to v2: remove name
        const { name, ...attrs } = doc.attributes;
        return {
          ...doc,
          attrs,
        };
      },
      down: (doc, ctx) => {
        // DOWN from v2: remove title
        return {
          ...doc,
          attributes: {
            ...doc.attributes,
            // UP to compat: copy title to name
            name: doc.attributes.title,
          },
        };
      },
    },
  },
};

//////////
// Example 2
// Just adding new optional fields
// No migration required
/////////

type Version2Attrs = Version1Attrs & {
  newField?: string;
};

const tagModelVersion2: SavedObjectsModelVersion<
  Version1Attrs,
  Version2Attrs, // only additions -> compat schema is also final one
  Version2Attrs
> = {
  expand: {
    addedMappings: {
      newField: {
        type: 'text',
      },
    },
    migration: {
      up: (doc, ctx) => {
        // UP to compat: no-op
        return doc;
      },
      down: (doc, ctx) => {
        // DOWN from compat: remove newField
        // NOTE: yes, there is a data loss here, if something got created in v2 then edited in v1
        const { newField, ...attrs } = doc.attributes;
        return {
          ...doc,
          attrs,
        };
      },
    },
  },
  contract: {
    removedMappings: [], // no fields to drop here
    migration: {
      up: (doc, ctx) => {
        // no-op
        return doc;
      },
      down: (doc, ctx) => {
        // no-op
        return doc;
      },
    },
  },
};



/////// End of examples

export const tagType: SavedObjectsType = {
  name: tagSavedObjectTypeName,
  hidden: false,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  // TODO: we would need to update the mappings to match the latest version of the doc version too
  //       not doing it to avoid the PR to fail to boot.
  mappings: {
    properties: {
      name: {
        type: 'text',
      },
      description: {
        type: 'text',
      },
      color: {
        type: 'text',
      },
    },
  },
  management: {
    importableAndExportable: true,
    defaultSearchField: 'name',
    icon: 'tag',
    getTitle: (obj: SavedObject<TagAttributes>) => obj.attributes.name,
  },
  // TODO: not really a fan of the Record structure given we're going to use a single-number versioniong
  //       convention for our model versions, but idk. Maybe having the number within the definition
  //       and using a list would be better?
  modelVersions: {
    // renaming the 'name' property to 'title'
    '1': tagModelVersion1,
    '2': tagModelVersion2,
  },
};
