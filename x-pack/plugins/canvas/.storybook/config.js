import '@elastic/eui/dist/eui_theme_k6_light.css';
import { configure } from '@storybook/react';
import { setAddon, addDecorator } from '@storybook/react';
import JSXAddon from 'storybook-addon-jsx';
import { withKnobs } from '@storybook/addon-knobs/react';
import { withInfo } from '@storybook/addon-info';

addDecorator(withKnobs);
addDecorator(withInfo({ inline: true }));
setAddon(JSXAddon);

// automatically import all files ending in *.examples.ts
const req = require.context('./..', true, /.examples.tsx$/);
function loadStories() {
  //require('./welcome');
  req.keys().forEach(filename => req(filename));
}

configure(loadStories, module);
