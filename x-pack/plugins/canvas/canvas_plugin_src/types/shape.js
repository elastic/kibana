export const shape = () => ({
  name: 'shape',
  to: {
    render: input => {
      return {
        type: 'render',
        as: 'shape',
        value: input,
      };
    },
  },
});
