import header from './header.png';

export const repeatImage = () => ({
  name: 'repeatImage',
  displayName: 'Image Repeat',
  help: 'Repeats an image N times',
  image: header,
  expression: `filters
| demodata
| math "mean(cost)"
| repeatImage image=null
| render`,
});
