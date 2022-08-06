import React from 'react';
import { reduxDecorator } from '../../../../storybook';
import { WorkpadFilters } from '../workpad_filters';
import { elementWithGroup, elements } from './elements';

export default {
  title: 'components/WorkpadFilters/WorkpadFilters',

  decorators: [
    (story) => (
      <div>
        <div className="canvasLayout__sidebar">
          <div style={{ width: '100%' }}>{story()}</div>
        </div>
      </div>
    ),
    reduxDecorator({ elements }),
  ],
};

export const ReduxDefault = () => <WorkpadFilters />;

ReduxDefault.story = {
  name: 'redux: default',
};

export const ReduxSelectedElementWithGroup = () => <WorkpadFilters element={elementWithGroup} />;

ReduxSelectedElementWithGroup.story = {
  name: 'redux: selected element with group',
};
