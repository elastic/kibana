import { palettes } from '../../../common/lib/palettes';
export const palette = () => ({
  name: 'palette',
  aliases: [],
  type: 'palette',
  help: 'Create a color palette',
  context: {
    types: ['null'],
  },
  args: {
    color: {
      aliases: ['_'],
      multi: true,
      types: ['string'],
      help: 'Palette colors, rgba, hex, or HTML color string. Pass this multiple times.',
    },
    gradient: {
      types: ['boolean'],
      default: false,
      help: 'Prefer to make a gradient where supported and useful?',
    },
    reverse: {
      type: ['boolean'],
      default: false,
      help: 'Reverse the palette',
    },
  },
  fn: (context, args) => {
    const colors = [].concat(args.color || palettes.paul_tor_14.colors);
    return {
      type: 'palette',
      colors: args.reverse ? colors.reverse() : colors,
      gradient: args.gradient,
    };
  },
});
