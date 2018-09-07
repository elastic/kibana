import { JSDOM } from 'jsdom';
import { APP_ROUTE } from '../../common/lib/constants';
import chrome from '../mocks/uiChrome';

const basePath = chrome.getBasePath();
const basename = `${basePath}${APP_ROUTE}`;

const { window } = new JSDOM('', {
  url: `http://localhost:5601/${basename}`,
  pretendToBeVisual: true,
});
global.window = window;
global.document = window.document;
global.navigator = window.navigator;
global.requestAnimationFrame = window.requestAnimationFrame;
global.HTMLElement = window.HTMLElement;
