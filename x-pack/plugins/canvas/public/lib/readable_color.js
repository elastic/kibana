import chroma from 'chroma-js';

export function readableColor(background, light, dark) {
  light = light || '#FFF';
  dark = dark || '#333';
  try {
    return chroma.contrast(background, '#000') < 7 ? light : dark;
  } catch (e) {
    return dark;
  }
}
