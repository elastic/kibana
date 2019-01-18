/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import { compose, getContext, withHandlers, withProps } from 'recompose';
import * as workpadService from '../../lib/workpad_service';
import { notify } from '../../lib/notify';
import { getId } from '../../lib/get_id';
import { templatesRegistry } from '../../lib/templates_registry';
import { tagsRegistry } from '../../lib/tags_registry';
import { WorkpadTemplates as Component } from './workpad_templates';

export const WorkpadTemplates = compose(
  getContext({
    router: PropTypes.object,
  }),
  withProps(() => ({
    templates: templatesRegistry.toJS(),
    uniqueTags: tagsRegistry.toJS(),
  })),
  withHandlers({
    // Clone workpad given an id
    cloneWorkpad: props => workpad => {
      workpad.id = getId('workpad');
      workpad.name = `Untitled Workpad - ${workpad.name}`;
      workpad.tags = undefined;
      return workpadService
        .create(workpad)
        .then(() => props.router.navigateTo('loadWorkpad', { id: workpad.id, page: 1 }))
        .catch(err => notify.error(err, { title: `Couldn't clone workpad template` }));
    },
  })
)(Component);
