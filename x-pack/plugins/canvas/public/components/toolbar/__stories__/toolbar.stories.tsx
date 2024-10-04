import React from 'react';

// @ts-expect-error
import { getDefaultPage } from '../../../state/defaults';
import { reduxDecorator } from '../../../../storybook';
import { Toolbar } from '../toolbar';

const pages = [...new Array(10)].map(() => getDefaultPage());

const Pages = ({ story }: { story: Function }) => (
  <div>
    {story()}
    <div style={{ visibility: 'hidden', position: 'absolute' }}>
      {pages.map((page, index) => (
        <div style={{ height: 66, width: 100, textAlign: 'center' }} id={page.id}>
          <h1 style={{ paddingTop: 22 }}>Page {index}</h1>
        </div>
      ))}
    </div>
  </div>
);

export default {
  title: 'components/Toolbar',
  decorators: [(story) => <Pages story={story} />, reduxDecorator({ pages })],
};

export const Redux = {
  render: () => <Toolbar />,
  name: 'redux',
};
