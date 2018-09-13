// return window if it exists, otherwise just return an object literal
const windowObj = {};

export const getWindow = () => {
  return typeof window === 'undefined' ? windowObj : window;
};
