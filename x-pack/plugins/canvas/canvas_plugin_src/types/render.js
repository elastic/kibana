export const render = () => ({
  name: 'render',
  from: {
    '*': v => ({
      type: 'render',
      as: 'debug',
      value: v,
    }),
  },
});
