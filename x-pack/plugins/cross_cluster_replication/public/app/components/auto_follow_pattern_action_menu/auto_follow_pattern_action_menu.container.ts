/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { connect } from 'react-redux';
import {
  AutoFollowPatternActionMenu as AutoFollowPatternActionMenuView,
  Props,
} from './auto_follow_pattern_action_menu';

// @ts-ignore
import { pauseAutoFollowPattern, resumeAutoFollowPattern } from '../../store/actions';

const mapDispatchToProps = (dispatch: (action: any) => void) => {
  return {
    pauseAutoFollowPattern: (ids: string[]) => {
      dispatch(pauseAutoFollowPattern(ids));
    },
    resumeAutoFollowPattern: (ids: string[]) => {
      dispatch(resumeAutoFollowPattern(ids));
    },
  };
};

export const AutoFollowPatternActionMenu = connect<null, any, Pick<Props, 'patterns'>>(
  null,
  mapDispatchToProps
)(AutoFollowPatternActionMenuView);
