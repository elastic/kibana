export const all = () => ({
  name: 'all',
  type: 'boolean',
  help: 'Return true if all of the conditions are true',
  args: {
    condition: {
      aliases: ['_'],
      types: ['boolean', 'null'],
      required: true,
      multi: true,
      help: 'One or more conditions to check',
    },
  },
  fn: (context, args) => {
    const conditions = args.condition || [];
    return conditions.every(Boolean);
  },
});
